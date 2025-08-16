// Backend/services/predictionService.js
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const PredictionData = require('../models/PredictionData'); // Historical orders
const Prediction = require('../models/Prediction');         // Generated predictions

class PredictionService {
  
  // Collect historical data for training
  async collectHistoricalData() {
    try {
      console.log('🔄 Collecting historical data for prediction model...');

      // Get orders from last 90 days
      const orders = await Order.find({
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }).populate('items.menuItem');

      if (orders.length === 0) {
        console.warn('⚠️ No historical orders found');
        return 0;
      }

      const dataPoints = new Map();

      for (const order of orders) {
        const date = new Date(order.createdAt);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;

        if (!dataPoints.has(dateKey)) {
          dataPoints.set(dateKey, {
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()),
            hour: date.getHours(),
            dayOfWeek: date.getDay(),
            weather: await this.getWeatherData(date),
            isHoliday: this.isHoliday(date),
            actualOrders: [],
            totalOrderCount: 0,
            totalRevenue: 0
          });
        }

        const dataPoint = dataPoints.get(dateKey);
        dataPoint.totalOrderCount++;
        dataPoint.totalRevenue += order.totalAmount;

        for (const item of order.items) {
          if (!item.menuItem || !item.menuItem._id) continue;

          const existingItem = dataPoint.actualOrders.find(
            ao => ao.menuItem.toString() === item.menuItem._id.toString()
          );

          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.revenue += item.price * item.quantity;
          } else {
            dataPoint.actualOrders.push({
              menuItem: item.menuItem._id,
              quantity: item.quantity,
              revenue: item.price * item.quantity
            });
          }
        }
      }

      // Save all data points to DB
      let savedCount = 0;
      for (const [key, data] of dataPoints) {
        try {
          await PredictionData.findOneAndUpdate(
            { date: data.date, hour: data.hour },
            data,
            { upsert: true }
          );
          savedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to save data point for ${data.date}:`, error.message);
        }
      }

      console.log(`✅ Collected and saved ${savedCount} data points for training`);
      return savedCount;
    } catch (error) {
      console.error('❌ Error collecting historical data:', error);
      throw new Error('Failed to collect historical data: ' + error.message);
    }
  }

  // Generate predictions for a given date and hour
  async generatePredictions(targetDate, targetHour) {
    try {
      console.log(`🔮 Generating predictions for ${targetDate} at hour ${targetHour}`);

      const dayOfWeek = new Date(targetDate).getDay();

      // Get historical data for same day & hour
      let historicalData = await PredictionData.find({
        dayOfWeek,
        hour: targetHour
      }).populate('actualOrders.menuItem').lean();

      if (!historicalData || historicalData.length === 0) {
        // Fallback: data for same hour across all days
        const fallbackData = await PredictionData.find({ hour: targetHour })
          .populate('actualOrders.menuItem').limit(10);
        if (!fallbackData || fallbackData.length === 0) {
          throw new Error('Insufficient historical data for prediction');
        }
        console.log(`⚠️ Using fallback data: ${fallbackData.length} records`);
        historicalData = fallbackData;
      }

      const allMenuItems = await MenuItem.find({ isAvailable: true });
      if (!allMenuItems || allMenuItems.length === 0) {
        throw new Error('No menu items available for prediction');
      }

      const menuItemStats = new Map();
      let totalOrdersSum = 0;
      let totalRevenueSum = 0;

      for (const data of historicalData) {
        totalOrdersSum += data.totalOrderCount || 0;
        totalRevenueSum += data.totalRevenue || 0;

        for (const order of data.actualOrders || []) {
          if (!order.menuItem || !order.menuItem._id) continue;

          const menuId = order.menuItem._id.toString();
          if (!menuItemStats.has(menuId)) {
            menuItemStats.set(menuId, { menuItem: order.menuItem, quantities: [], revenues: [] });
          }

          menuItemStats.get(menuId).quantities.push(order.quantity || 0);
          menuItemStats.get(menuId).revenues.push(order.revenue || 0);
        }
      }

      // Build predictions array
      const predictions = [];
      for (const menuItem of allMenuItems) {
        const menuId = menuItem._id.toString();
        const stats = menuItemStats.get(menuId);

        let avgQuantity = 0;
        let confidence = 0.1;
        if (stats && stats.quantities.length > 0) {
          avgQuantity = stats.quantities.reduce((a, b) => a + b, 0) / stats.quantities.length;
          const variance = stats.quantities.reduce((acc, val) => acc + Math.pow(val - avgQuantity, 2), 0) / stats.quantities.length;
          confidence = Math.max(0.1, Math.min(0.95, 1 - (variance / (avgQuantity + 1))));
        }

        const trendMultiplier = this.calculateTrendMultiplier(targetDate, dayOfWeek, targetHour);
        const seasonalMultiplier = this.calculateSeasonalMultiplier(targetDate);
        const weatherMultiplier = await this.getWeatherMultiplier(targetDate);

        const predictedQuantity = Math.max(0, Math.round(avgQuantity * trendMultiplier * seasonalMultiplier * weatherMultiplier));

        if (predictedQuantity > 0 || avgQuantity > 0) {
          predictions.push({
            menuItem: menuItem._id,
            predictedQuantity,
            confidence,
            factors: [
              { factor: 'historical_average', impact: avgQuantity },
              { factor: 'trend_adjustment', impact: trendMultiplier },
              { factor: 'seasonal_adjustment', impact: seasonalMultiplier },
              { factor: 'weather_impact', impact: weatherMultiplier }
            ]
          });
        }
      }

      const totalPredictedOrders = predictions.reduce((sum, p) => sum + p.predictedQuantity, 0);
      const avgRevenue = historicalData.length > 0 ? totalRevenueSum / historicalData.length : 1000;
      const avgOrderCount = historicalData.length > 0 ? totalOrdersSum / historicalData.length : 1;
      const revenuePerOrder = avgOrderCount > 0 ? avgRevenue / avgOrderCount : 500;
      const totalPredictedRevenue = Math.round(totalPredictedOrders * revenuePerOrder);

      // Upsert prediction
      let predictionDoc = await Prediction.findOne({ predictionFor: new Date(targetDate), hour: targetHour });
      if (predictionDoc) {
        predictionDoc = await Prediction.findByIdAndUpdate(
          predictionDoc._id,
          { predictions, totalPredictedOrders, totalPredictedRevenue, weatherData: await this.getWeatherData(new Date(targetDate)) },
          { new: true }
        );
      } else {
        predictionDoc = new Prediction({ predictionFor: new Date(targetDate), hour: targetHour, predictions, totalPredictedOrders, totalPredictedRevenue, weatherData: await this.getWeatherData(new Date(targetDate)) });
        await predictionDoc.save();
      }

      console.log(`✅ Generated ${predictions.length} item predictions (${totalPredictedOrders} total orders)`);
      return predictionDoc;

    } catch (error) {
      console.error('❌ Error generating predictions:', error);
      throw new Error('Failed to generate predictions: ' + error.message);
    }
  }

  // Trend, seasonal, weather helper methods
  calculateTrendMultiplier(date, dayOfWeek, hour) {
    const now = new Date();
    const daysDiff = Math.floor((new Date(date) - now) / (1000 * 60 * 60 * 24));
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;
    const peakHoursBoost = (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21) ? 1.3 : (hour >= 7 && hour <= 9) ? 1.1 : 1.0;
    const futureDiscount = Math.max(0.8, 1 - (daysDiff * 0.05));
    return weekendBoost * peakHoursBoost * futureDiscount;
  }

  calculateSeasonalMultiplier(date) {
    const month = new Date(date).getMonth();
    const seasonalFactors = {0:0.9,1:0.95,2:1.0,3:1.1,4:1.2,5:1.3,6:1.25,7:1.2,8:1.1,9:1.05,10:1.15,11:1.3};
    return seasonalFactors[month] || 1.0;
  }

  async getWeatherMultiplier(date) {
    const weather = await this.getWeatherData(date);
    const weatherMultipliers = { sunny:1.1, rainy:1.3, cloudy:1.0, stormy:1.4 };
    return weatherMultipliers[weather.condition] || 1.0;
  }

  async getWeatherData(date) {
    const conditions = ['sunny','rainy','cloudy','stormy'];
    const randomCondition = conditions[Math.floor(Math.random()*conditions.length)];
    return { temperature: Math.floor(Math.random()*30)+15, condition: randomCondition, humidity: Math.floor(Math.random()*40)+40 };
  }

  isHoliday(date) {
    const holidays = ['2024-01-01','2024-01-26','2024-08-15','2024-10-02','2024-12-25','2025-01-01','2025-01-26','2025-08-15','2025-10-02','2025-12-25'];
    return holidays.includes(date.toISOString().split('T')[0]);
  }

  // Update prediction accuracy after actual results
  async updatePredictionAccuracy(predictionId, actualOrders) {
    try {
      const prediction = await Prediction.findById(predictionId);
      if (!prediction) return;

      let totalAccuracy = 0;
      let itemCount = 0;

      for (const pred of prediction.predictions) {
        const actual = actualOrders.find(o => o.menuItem && o.menuItem.toString() === pred.menuItem.toString());
        const actualQuantity = actual ? actual.quantity : 0;
        const predictedQuantity = pred.predictedQuantity || 0;
        const maxQuantity = Math.max(predictedQuantity, actualQuantity, 1);
        const accuracy = 1 - Math.abs(predictedQuantity - actualQuantity) / maxQuantity;
        totalAccuracy += Math.max(0, accuracy);
        itemCount++;
      }

      if (itemCount > 0) {
        prediction.accuracy = totalAccuracy / itemCount;
        await prediction.save();
        console.log(`✅ Updated prediction accuracy: ${(prediction.accuracy*100).toFixed(2)}%`);
      }
    } catch (error) {
      console.error('❌ Error updating prediction accuracy:', error);
    }
  }
}

// Export instance
module.exports = new PredictionService();
module.exports.PredictionService = PredictionService;
