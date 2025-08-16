const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const PredictionData = require('../models/PredictionData');
const Prediction = require('../models/Prediction');

class PredictionService {
  
  // Collect historical data for training
  async collectHistoricalData() {
    try {
      console.log('🔄 Collecting historical data for prediction model...');
      
      const orders = await Order.find({
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      }).populate('items.menuItem');

      const dataPoints = new Map();

      for (const order of orders) {
        const date = new Date(order.createdAt);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        
        if (!dataPoints.has(dateKey)) {
          dataPoints.set(dateKey, {
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()),
            hour: date.getHours(),
            dayOfWeek: date.getDay(),
            weather: await this.getWeatherData(date), // Mock weather data
            isHoliday: this.isHoliday(date),
            actualOrders: [],
            totalOrderCount: 0,
            totalRevenue: 0
          });
        }

        const dataPoint = dataPoints.get(dateKey);
        dataPoint.totalOrderCount++;
        dataPoint.totalRevenue += order.totalAmount;

        // Add menu items
        for (const item of order.items) {
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

      // Save to database
      for (const [key, data] of dataPoints) {
        await PredictionData.findOneAndUpdate(
          { date: data.date, hour: data.hour },
          data,
          { upsert: true }
        );
      }

      console.log(`✅ Collected ${dataPoints.size} data points for training`);
      return dataPoints.size;
    } catch (error) {
      console.error('❌ Error collecting historical data:', error);
      throw error;
    }
  }

  // Simple prediction algorithm (can be replaced with ML model)
  async generatePredictions(targetDate, targetHour) {
    try {
      console.log(`🔮 Generating predictions for ${targetDate} at hour ${targetHour}`);

      const dayOfWeek = new Date(targetDate).getDay();
      
      // Get historical data for same day of week and hour
      const historicalData = await PredictionData.find({
        dayOfWeek: dayOfWeek,
        hour: targetHour
      }).populate('actualOrders.menuItem');

      if (historicalData.length === 0) {
        throw new Error('Insufficient historical data for prediction');
      }

      // Calculate averages and trends
      const menuItemPredictions = new Map();
      let totalOrdersSum = 0;
      let totalRevenueSum = 0;

      for (const data of historicalData) {
        totalOrdersSum += data.totalOrderCount;
        totalRevenueSum += data.totalRevenue;

        for (const order of data.actualOrders) {
          const menuId = order.menuItem._id.toString();
          
          if (!menuItemPredictions.has(menuId)) {
            menuItemPredictions.set(menuId, {
              menuItem: order.menuItem,
              quantities: [],
              revenues: []
            });
          }
          
          menuItemPredictions.get(menuId).quantities.push(order.quantity);
          menuItemPredictions.get(menuId).revenues.push(order.revenue);
        }
      }

      // Generate predictions with confidence scores
      const predictions = [];
      
      for (const [menuId, data] of menuItemPredictions) {
        const avgQuantity = data.quantities.reduce((a, b) => a + b, 0) / data.quantities.length;
        const variance = data.quantities.reduce((acc, val) => acc + Math.pow(val - avgQuantity, 2), 0) / data.quantities.length;
        const confidence = Math.max(0.1, Math.min(0.95, 1 - (variance / (avgQuantity + 1))));

        // Apply trend and seasonal adjustments
        const trendMultiplier = this.calculateTrendMultiplier(targetDate, dayOfWeek, targetHour);
        const seasonalMultiplier = this.calculateSeasonalMultiplier(targetDate);
        const weatherMultiplier = await this.getWeatherMultiplier(targetDate);

        const predictedQuantity = Math.round(avgQuantity * trendMultiplier * seasonalMultiplier * weatherMultiplier);

        predictions.push({
          menuItem: data.menuItem._id,
          predictedQuantity: Math.max(0, predictedQuantity),
          confidence: confidence,
          factors: [
            { factor: 'historical_average', impact: avgQuantity },
            { factor: 'trend_adjustment', impact: trendMultiplier },
            { factor: 'seasonal_adjustment', impact: seasonalMultiplier },
            { factor: 'weather_impact', impact: weatherMultiplier }
          ]
        });
      }

      // Calculate totals
      const totalPredictedOrders = predictions.reduce((sum, p) => sum + p.predictedQuantity, 0);
      const avgRevenue = totalRevenueSum / historicalData.length;
      const totalPredictedRevenue = Math.round(avgRevenue * (totalPredictedOrders / (totalOrdersSum / historicalData.length)));

      // Save prediction
      const predictionDoc = new Prediction({
        predictionFor: new Date(targetDate),
        hour: targetHour,
        predictions: predictions,
        totalPredictedOrders: totalPredictedOrders,
        totalPredictedRevenue: totalPredictedRevenue,
        weatherData: await this.getWeatherData(new Date(targetDate))
      });

      await predictionDoc.save();
      
      console.log(`✅ Generated ${predictions.length} item predictions`);
      return predictionDoc;
    } catch (error) {
      console.error('❌ Error generating predictions:', error);
      throw error;
    }
  }

  // Helper methods
  calculateTrendMultiplier(date, dayOfWeek, hour) {
    // Simple trend calculation - in real app, use more sophisticated algorithms
    const now = new Date();
    const daysDiff = Math.floor((new Date(date) - now) / (1000 * 60 * 60 * 24));
    
    // Weekend boost
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;
    
    // Peak hours boost
    const peakHoursBoost = (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21) ? 1.3 : 1.0;
    
    return weekendBoost * peakHoursBoost;
  }

  calculateSeasonalMultiplier(date) {
    const month = new Date(date).getMonth();
    
    // Seasonal adjustments (example)
    const seasonalFactors = {
      0: 0.9,  // January
      1: 0.95, // February
      2: 1.0,  // March
      3: 1.1,  // April
      4: 1.2,  // May
      5: 1.3,  // June
      6: 1.25, // July
      7: 1.2,  // August
      8: 1.1,  // September
      9: 1.05, // October
      10: 1.15, // November
      11: 1.3   // December
    };
    
    return seasonalFactors[month] || 1.0;
  }

  async getWeatherMultiplier(date) {
    // Mock weather impact - integrate with real weather API
    const weather = await this.getWeatherData(date);
    
    const weatherMultipliers = {
      'sunny': 1.1,
      'rainy': 1.3,  // More delivery orders
      'cloudy': 1.0,
      'stormy': 1.4   // Highest delivery demand
    };
    
    return weatherMultipliers[weather.condition] || 1.0;
  }

  async getWeatherData(date) {
    // Mock weather data - integrate with OpenWeatherMap API
    const conditions = ['sunny', 'rainy', 'cloudy', 'stormy'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: Math.floor(Math.random() * 30) + 15, // 15-45°C
      condition: randomCondition,
      humidity: Math.floor(Math.random() * 40) + 40 // 40-80%
    };
  }

  isHoliday(date) {
    // Simple holiday detection - extend with real holiday calendar
    const holidays = [
      '2024-01-01', '2024-01-26', '2024-08-15', '2024-10-02', '2024-12-25'
    ];
    const dateString = date.toISOString().split('T')[0];
    return holidays.includes(dateString);
  }

  // Update prediction accuracy after actual results
  async updatePredictionAccuracy(predictionId, actualOrders) {
    try {
      const prediction = await Prediction.findById(predictionId);
      if (!prediction) return;

      let totalAccuracy = 0;
      let itemCount = 0;

      for (const pred of prediction.predictions) {
        const actual = actualOrders.find(
          order => order.menuItem.toString() === pred.menuItem.toString()
        );
        
        const actualQuantity = actual ? actual.quantity : 0;
        const accuracy = 1 - Math.abs(pred.predictedQuantity - actualQuantity) / 
                        (Math.max(pred.predictedQuantity, actualQuantity, 1));
        
        totalAccuracy += Math.max(0, accuracy);
        itemCount++;
      }

      prediction.accuracy = totalAccuracy / itemCount;
      await prediction.save();

      console.log(`✅ Updated prediction accuracy: ${(prediction.accuracy * 100).toFixed(2)}%`);
    } catch (error) {
      console.error('❌ Error updating prediction accuracy:', error);
    }
  }
}

module.exports = new PredictionService();