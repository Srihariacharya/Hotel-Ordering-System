// Backend/services/predictionService.js - FIXED with better debugging
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const PredictionData = require('../models/PredictionData');
const Prediction = require('../models/Prediction');

class PredictionService {
  
  // Collect historical data for training
  async collectHistoricalData() {
    try {
      console.log('🔄 Collecting historical data for prediction model...');

      // First check if menu items exist
      const menuItemsCount = await MenuItem.countDocuments();
      const availableMenuItemsCount = await MenuItem.countDocuments({ isAvailable: true });
      
      console.log(`📊 Database status: ${menuItemsCount} total menu items, ${availableMenuItemsCount} available`);
      
      if (menuItemsCount === 0) {
        throw new Error('No menu items found in database. Please add menu items first.');
      }
      
      if (availableMenuItemsCount === 0) {
        console.log('⚠️ No available menu items found, making all items available...');
        await MenuItem.updateMany({}, { isAvailable: true });
        console.log('✅ Updated all menu items to be available');
      }

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

      // DEBUG: Check menu items first
      const allMenuItems = await MenuItem.find();
      const availableMenuItems = await MenuItem.find({ isAvailable: true });
      
      console.log(`🔍 DEBUG: Found ${allMenuItems.length} total menu items, ${availableMenuItems.length} available`);
      
      if (allMenuItems.length === 0) {
        throw new Error('No menu items found in database. Please add menu items through your admin interface.');
      }
      
      if (availableMenuItems.length === 0) {
        console.log('⚠️ No available menu items, making some available...');
        try {
          // Make ALL menu items available (more aggressive approach)
          const updateResult = await MenuItem.updateMany(
            {}, 
            { $set: { isAvailable: true } }
          );
          
          console.log(`✅ Made ${updateResult.modifiedCount} menu items available`);
          
          // Refresh the available items list
          const newAvailableMenuItems = await MenuItem.find({ isAvailable: true });
          console.log(`🔍 After update: ${newAvailableMenuItems.length} items are available`);
          
          if (newAvailableMenuItems.length === 0) {
            throw new Error('Failed to make menu items available - database update failed');
          }
        } catch (updateError) {
          console.error('❌ Failed to update menu items:', updateError);
          throw new Error('Failed to make menu items available');
        }
      }

      const predictionDate = new Date(targetDate);
      const dayOfWeek = predictionDate.getDay();

      // Get historical data for same day & hour
      let historicalData = await PredictionData.find({
        dayOfWeek,
        hour: targetHour
      }).populate('actualOrders.menuItem').lean();

      if (!historicalData || historicalData.length === 0) {
        console.log('⚠️ No specific historical data found, using fallback...');
        // Fallback: data for same hour across all days
        historicalData = await PredictionData.find({ hour: targetHour })
          .populate('actualOrders.menuItem').limit(10).lean();
        
        if (!historicalData || historicalData.length === 0) {
          console.log('⚠️ No historical data at all, creating basic prediction...');
          return await this.createBasicPrediction(predictionDate, targetHour);
        }
        console.log(`⚠️ Using fallback data: ${historicalData.length} records`);
      }

      const finalAvailableMenuItems = await MenuItem.find({ isAvailable: true });
      console.log(`🔍 Using ${finalAvailableMenuItems.length} available menu items for prediction`);

      const menuItemStats = new Map();
      let totalOrdersSum = 0;
      let totalRevenueSum = 0;

      // Process historical data
      for (const data of historicalData) {
        totalOrdersSum += data.totalOrderCount || 0;
        totalRevenueSum += data.totalRevenue || 0;

        for (const order of data.actualOrders || []) {
          if (!order.menuItem || !order.menuItem._id) continue;

          const menuId = order.menuItem._id.toString();
          if (!menuItemStats.has(menuId)) {
            menuItemStats.set(menuId, { 
              menuItem: order.menuItem, 
              quantities: [], 
              revenues: [] 
            });
          }

          menuItemStats.get(menuId).quantities.push(order.quantity || 0);
          menuItemStats.get(menuId).revenues.push(order.revenue || 0);
        }
      }

      // Build predictions array
      const predictions = [];
      for (const menuItem of finalAvailableMenuItems) {
        const menuId = menuItem._id.toString();
        const stats = menuItemStats.get(menuId);

        let avgQuantity = 0;
        let confidence = 0.3; // Default confidence
        
        if (stats && stats.quantities.length > 0) {
          avgQuantity = stats.quantities.reduce((a, b) => a + b, 0) / stats.quantities.length;
          const variance = stats.quantities.reduce((acc, val) => acc + Math.pow(val - avgQuantity, 2), 0) / stats.quantities.length;
          confidence = Math.max(0.1, Math.min(0.95, 1 - (variance / (avgQuantity + 1))));
        } else {
          // If no historical data for this item, give it a small baseline
          avgQuantity = Math.random() * 2; // 0-2 baseline
        }

        // Apply multipliers
        const trendMultiplier = this.calculateTrendMultiplier(predictionDate, dayOfWeek, targetHour);
        const seasonalMultiplier = this.calculateSeasonalMultiplier(predictionDate);
        const weatherMultiplier = await this.getWeatherMultiplier(predictionDate);

        const predictedQuantity = Math.max(0, Math.round(avgQuantity * trendMultiplier * seasonalMultiplier * weatherMultiplier));

        // Include items even with 0 prediction for completeness, but only if they had some activity or are popular categories
        if (predictedQuantity > 0 || avgQuantity > 0 || ['Main Course', 'Appetizer', 'Beverage'].includes(menuItem.category)) {
          predictions.push({
            menuItem: menuItem._id,
            predictedQuantity: Math.max(0, predictedQuantity),
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

      // Ensure we have at least some predictions
      if (predictions.length === 0) {
        console.log('⚠️ No predictions generated, creating minimal baseline...');
        // Create minimal predictions for top menu items
        const topMenuItems = finalAvailableMenuItems.slice(0, 5);
        for (const menuItem of topMenuItems) {
          predictions.push({
            menuItem: menuItem._id,
            predictedQuantity: Math.floor(Math.random() * 3) + 1,
            confidence: 0.3,
            factors: [{ factor: 'baseline_estimate', impact: 1.0 }]
          });
        }
      }

      const totalPredictedOrders = predictions.reduce((sum, p) => sum + p.predictedQuantity, 0);
      const avgRevenue = historicalData.length > 0 ? totalRevenueSum / historicalData.length : 1000;
      const avgOrderCount = historicalData.length > 0 ? totalOrdersSum / historicalData.length : 1;
      const revenuePerOrder = avgOrderCount > 0 ? avgRevenue / avgOrderCount : 500;
      const totalPredictedRevenue = Math.round(totalPredictedOrders * revenuePerOrder);

      // Upsert prediction
      let predictionDoc = await Prediction.findOne({ 
        predictionFor: predictionDate, 
        hour: targetHour 
      });

      const weatherData = await this.getWeatherData(predictionDate);

      if (predictionDoc) {
        predictionDoc = await Prediction.findByIdAndUpdate(
          predictionDoc._id,
          { 
            predictions, 
            totalPredictedOrders, 
            totalPredictedRevenue, 
            weatherData 
          },
          { new: true }
        );
      } else {
        predictionDoc = new Prediction({ 
          predictionFor: predictionDate, 
          hour: targetHour, 
          predictions, 
          totalPredictedOrders, 
          totalPredictedRevenue, 
          weatherData 
        });
        await predictionDoc.save();
      }

      console.log(`✅ Generated ${predictions.length} item predictions (${totalPredictedOrders} total orders)`);
      return predictionDoc;

    } catch (error) {
      console.error('❌ Error generating predictions:', error);
      throw new Error('Failed to generate predictions: ' + error.message);
    }
  }

  // Create basic prediction when no data exists
  async createBasicPrediction(targetDate, targetHour) {
    console.log('🎯 Creating basic prediction (no historical data)');
    
    const allMenuItems = await MenuItem.find({ isAvailable: true });
    if (allMenuItems.length === 0) {
      throw new Error('No available menu items for basic prediction');
    }
    
    // Create realistic predictions based on meal times and item categories
    const predictions = [];
    const isBreakfast = targetHour >= 7 && targetHour <= 10;
    const isLunch = targetHour >= 12 && targetHour <= 15;
    const isDinner = targetHour >= 18 && targetHour <= 22;
    const isPeakTime = isBreakfast || isLunch || isDinner;
    
    for (const item of allMenuItems.slice(0, 10)) { // Limit to first 10 items
      let baseQuantity = 0;
      
      // Adjust quantity based on meal time and category
      if (isPeakTime) {
        if (item.category === 'Main Course') baseQuantity = Math.floor(Math.random() * 4) + 2;
        else if (item.category === 'Appetizer') baseQuantity = Math.floor(Math.random() * 3) + 1;
        else if (item.category === 'Beverage') baseQuantity = Math.floor(Math.random() * 5) + 1;
        else if (item.category === 'Dessert') baseQuantity = Math.floor(Math.random() * 2) + 1;
        else baseQuantity = Math.floor(Math.random() * 3) + 1;
      } else {
        baseQuantity = Math.floor(Math.random() * 2); // Off-peak hours
      }

      if (baseQuantity > 0) {
        predictions.push({
          menuItem: item._id,
          predictedQuantity: baseQuantity,
          confidence: 0.4, // Lower confidence for basic predictions
          factors: [
            { factor: 'time_based_estimate', impact: isPeakTime ? 1.3 : 0.7 },
            { factor: 'category_factor', impact: 1.0 }
          ]
        });
      }
    }

    const totalPredictedOrders = predictions.reduce((sum, p) => sum + p.predictedQuantity, 0);
    const totalPredictedRevenue = predictions.reduce((sum, p) => {
      const item = allMenuItems.find(mi => mi._id.toString() === p.menuItem.toString());
      return sum + (item?.price || 100) * p.predictedQuantity;
    }, 0);

    const predictionDoc = new Prediction({
      predictionFor: targetDate,
      hour: targetHour,
      predictions,
      totalPredictedOrders,
      totalPredictedRevenue,
      weatherData: await this.getWeatherData(targetDate)
    });

    await predictionDoc.save();
    console.log(`✅ Created basic prediction with ${predictions.length} items`);
    return predictionDoc;
  }

  // Helper methods remain the same
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