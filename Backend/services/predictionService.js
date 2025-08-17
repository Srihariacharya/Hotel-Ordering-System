// Backend/services/predictionService.js - FULLY UPDATED & FIXED VERSION
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const PredictionData = require('../models/PredictionData');
const Prediction = require('../models/Prediction');

class PredictionService {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize service - ensure database is ready
  async initialize() {
    try {
      if (this.isInitialized) return;
      
      console.log('🔧 Initializing PredictionService...');
      
      // Check if we have menu items
      const menuItemCount = await MenuItem.countDocuments();
      if (menuItemCount === 0) {
        console.warn('⚠️ No menu items found - predictions will be limited');
      }
      
      // Ensure all menu items are available by default
      await MenuItem.updateMany(
        { isAvailable: { $ne: true } },
        { $set: { isAvailable: true } }
      );
      
      this.isInitialized = true;
      console.log('✅ PredictionService initialized');
    } catch (error) {
      console.error('❌ PredictionService initialization failed:', error);
      throw error;
    }
  }

  // Collect historical data for training
  async collectHistoricalData() {
    try {
      await this.initialize();
      console.log('🔄 Collecting historical data for prediction model...');

      const menuItemsCount = await MenuItem.countDocuments();
      const availableMenuItemsCount = await MenuItem.countDocuments({ isAvailable: true });
      
      console.log(`📊 Database status: ${menuItemsCount} total menu items, ${availableMenuItemsCount} available`);
      
      if (menuItemsCount === 0) {
        throw new Error('No menu items found in database. Please add menu items first.');
      }
      
      if (availableMenuItemsCount === 0) {
        console.log('⚠️ No available menu items found, making all items available...');
        const updateResult = await MenuItem.updateMany({}, { $set: { isAvailable: true } });
        console.log(`✅ Updated ${updateResult.modifiedCount} menu items to be available`);
      }

      // Get orders from last 90 days
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const orders = await Order.find({
        createdAt: { $gte: startDate },
        status: { $in: ['delivered', 'served', 'completed'] } // Only successful orders
      }).populate({
        path: 'items.menuItem',
        select: 'name price category'
      }).lean();

      if (orders.length === 0) {
        console.warn('⚠️ No historical orders found for training');
        return 0;
      }

      console.log(`📈 Processing ${orders.length} historical orders...`);

      const dataPoints = new Map();

      for (const order of orders) {
        try {
          const date = new Date(order.createdAt);
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;

          if (!dataPoints.has(dateKey)) {
            dataPoints.set(dateKey, {
              date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0, 0),
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
          dataPoint.totalRevenue += order.totalAmount || 0;

          // Process order items
          if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
              if (!item.menuItem || !item.menuItem._id) continue;

              const existingItem = dataPoint.actualOrders.find(
                ao => ao.menuItem.toString() === item.menuItem._id.toString()
              );

              if (existingItem) {
                existingItem.quantity += item.quantity || 0;
                existingItem.revenue += (item.price || 0) * (item.quantity || 0);
              } else {
                dataPoint.actualOrders.push({
                  menuItem: item.menuItem._id,
                  quantity: item.quantity || 0,
                  revenue: (item.price || 0) * (item.quantity || 0)
                });
              }
            }
          }
        } catch (orderError) {
          console.warn(`⚠️ Error processing order ${order._id}:`, orderError.message);
        }
      }

      // Save data points to database
      let savedCount = 0;
      const batchSize = 50;
      const dataPointsArray = Array.from(dataPoints.values());

      for (let i = 0; i < dataPointsArray.length; i += batchSize) {
        const batch = dataPointsArray.slice(i, i + batchSize);
        
        for (const data of batch) {
          try {
            await PredictionData.findOneAndUpdate(
              { 
                date: data.date, 
                hour: data.hour 
              },
              data,
              { 
                upsert: true,
                new: true,
                runValidators: true
              }
            );
            savedCount++;
          } catch (error) {
            console.warn(`⚠️ Failed to save data point for ${data.date}:`, error.message);
          }
        }
        
        // Progress indicator
        console.log(`📝 Processed ${Math.min(i + batchSize, dataPointsArray.length)}/${dataPointsArray.length} data points...`);
      }

      console.log(`✅ Successfully collected and saved ${savedCount} data points for training`);
      return savedCount;
    } catch (error) {
      console.error('❌ Error collecting historical data:', error);
      throw new Error(`Failed to collect historical data: ${error.message}`);
    }
  }

  // Generate predictions for a given date and hour
  async generatePredictions(targetDate, targetHour) {
    try {
      await this.initialize();
      console.log(`🔮 Generating predictions for ${targetDate} at hour ${targetHour}`);

      // Validate inputs
      if (!targetDate || targetHour < 0 || targetHour > 23) {
        throw new Error('Invalid date or hour provided');
      }

      const predictionDate = new Date(targetDate);
      if (isNaN(predictionDate.getTime())) {
        throw new Error('Invalid date format provided');
      }

      // Get available menu items
      const allMenuItems = await MenuItem.find().lean();
      let availableMenuItems = await MenuItem.find({ isAvailable: true }).lean();
      
      console.log(`🔍 Found ${allMenuItems.length} total menu items, ${availableMenuItems.length} available`);
      
      if (allMenuItems.length === 0) {
        throw new Error('No menu items found in database. Please add menu items first.');
      }

      // If no available items, make some available
      if (availableMenuItems.length === 0) {
        const updateResult = await MenuItem.updateMany({}, { $set: { isAvailable: true } });
        console.log(`✅ Made ${updateResult.modifiedCount} menu items available`);
        availableMenuItems = await MenuItem.find({ isAvailable: true }).lean();
      }

      // Check for existing prediction
      let existingPrediction = await Prediction.findOne({
        predictionFor: {
          $gte: new Date(predictionDate.getFullYear(), predictionDate.getMonth(), predictionDate.getDate()),
          $lt: new Date(predictionDate.getFullYear(), predictionDate.getMonth(), predictionDate.getDate() + 1)
        },
        hour: targetHour
      });

      const dayOfWeek = predictionDate.getDay();

      // Get historical data for similar conditions
      let historicalData = await PredictionData.find({ 
        dayOfWeek, 
        hour: targetHour 
      }).populate('actualOrders.menuItem', 'name price category').lean();

      // Fallback to any hour data if no specific hour data
      if (!historicalData || historicalData.length === 0) {
        console.log('⚠️ No specific historical data found, using fallback...');
        historicalData = await PredictionData.find({ 
          hour: targetHour 
        }).populate('actualOrders.menuItem', 'name price category').limit(20).lean();
      }

      // If still no data, use broader fallback
      if (!historicalData || historicalData.length === 0) {
        console.log('⚠️ No historical data at all, creating basic prediction...');
        return await this.createBasicPrediction(predictionDate, targetHour, existingPrediction);
      }

      console.log(`📊 Using ${historicalData.length} historical data points`);

      // Analyze historical patterns
      const menuItemStats = new Map();
      let totalOrdersSum = 0;
      let totalRevenueSum = 0;

      for (const data of historicalData) {
        totalOrdersSum += data.totalOrderCount || 0;
        totalRevenueSum += data.totalRevenue || 0;

        if (data.actualOrders && Array.isArray(data.actualOrders)) {
          for (const order of data.actualOrders) {
            if (!order.menuItem || !order.menuItem._id) continue;

            const menuId = order.menuItem._id.toString();
            if (!menuItemStats.has(menuId)) {
              menuItemStats.set(menuId, { 
                quantities: [], 
                revenues: [],
                name: order.menuItem.name || 'Unknown',
                price: order.menuItem.price || 0
              });
            }

            const stats = menuItemStats.get(menuId);
            stats.quantities.push(order.quantity || 0);
            stats.revenues.push(order.revenue || 0);
          }
        }
      }

      // Generate predictions for each available menu item
      const predictions = [];
      const weatherMultiplier = await this.getWeatherMultiplier(predictionDate);
      const trendMultiplier = this.calculateTrendMultiplier(predictionDate, dayOfWeek, targetHour);
      const seasonalMultiplier = this.calculateSeasonalMultiplier(predictionDate);

      for (const menuItem of availableMenuItems) {
        const stats = menuItemStats.get(menuItem._id.toString());
        let avgQuantity = 0;
        let confidence = 0.3; // Default low confidence

        if (stats && stats.quantities.length > 0) {
          // Calculate average and confidence from historical data
          avgQuantity = stats.quantities.reduce((a, b) => a + b, 0) / stats.quantities.length;
          
          // Calculate variance for confidence
          const variance = stats.quantities.reduce((acc, val) => 
            acc + Math.pow(val - avgQuantity, 2), 0) / stats.quantities.length;
          const standardDeviation = Math.sqrt(variance);
          
          // Confidence based on consistency (lower variance = higher confidence)
          confidence = Math.max(0.1, Math.min(0.95, 1 - (standardDeviation / (avgQuantity + 1))));
        } else {
          // No historical data, use category-based estimation
          avgQuantity = this.getBaseCategoryQuantity(menuItem.category);
          confidence = 0.2;
        }

        // Apply multipliers
        let predictedQuantity = avgQuantity * trendMultiplier * seasonalMultiplier * weatherMultiplier;
        
        // Add some randomness for variety (±20%)
        const randomFactor = 0.8 + (Math.random() * 0.4);
        predictedQuantity *= randomFactor;
        
        // Round and ensure minimum 0
        predictedQuantity = Math.max(0, Math.round(predictedQuantity));

        // Only include items with predicted demand
        if (predictedQuantity > 0 || avgQuantity > 0.1) {
          predictions.push({
            menuItem: menuItem._id,
            predictedQuantity,
            confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
            factors: [
              { factor: 'historical_average', impact: Math.min(5, Math.max(0, avgQuantity)) },
              { factor: 'trend_adjustment', impact: Math.min(5, Math.max(0, trendMultiplier)) },
              { factor: 'seasonal_adjustment', impact: Math.min(5, Math.max(0, seasonalMultiplier)) },
              { factor: 'weather_impact', impact: Math.min(5, Math.max(0, weatherMultiplier)) }
            ]
          });
        }
      }

      // Ensure we have some predictions
      if (predictions.length === 0) {
        console.log('⚠️ No predictions generated from historical data, creating baseline...');
        const topMenuItems = availableMenuItems.slice(0, Math.min(8, availableMenuItems.length));
        
        for (const item of topMenuItems) {
          const baseQuantity = this.getBaseCategoryQuantity(item.category) * trendMultiplier;
          predictions.push({
            menuItem: item._id,
            predictedQuantity: Math.max(1, Math.round(baseQuantity)),
            confidence: 0.4,
            factors: [{ factor: 'baseline_estimate', impact: 2.0 }]
          });
        }
      }

      // Calculate totals
      const totalPredictedOrders = predictions.reduce((sum, p) => sum + p.predictedQuantity, 0);
      
      // Calculate revenue by looking up menu item prices
      let totalPredictedRevenue = 0;
      for (const prediction of predictions) {
        const menuItem = availableMenuItems.find(item => 
          item._id.toString() === prediction.menuItem.toString()
        );
        if (menuItem && menuItem.price) {
          totalPredictedRevenue += menuItem.price * prediction.predictedQuantity;
        }
      }
      totalPredictedRevenue = Math.round(totalPredictedRevenue);

      // Get weather data
      const weatherData = await this.getWeatherData(predictionDate);

      // Save or update prediction
      let predictionDoc;
      if (existingPrediction) {
        predictionDoc = await Prediction.findByIdAndUpdate(
          existingPrediction._id,
          {
            predictions,
            totalPredictedOrders,
            totalPredictedRevenue,
            weatherData,
            isHoliday: this.isHoliday(predictionDate)
          },
          { new: true, runValidators: true }
        );
        console.log('📝 Updated existing prediction');
      } else {
        predictionDoc = new Prediction({
          predictionFor: predictionDate,
          hour: targetHour,
          predictions,
          totalPredictedOrders,
          totalPredictedRevenue,
          weatherData,
          isHoliday: this.isHoliday(predictionDate)
        });
        await predictionDoc.save();
        console.log('📝 Created new prediction');
      }

      console.log(`✅ Generated ${predictions.length} item predictions (${totalPredictedOrders} total orders, ₹${totalPredictedRevenue} revenue)`);
      return predictionDoc;

    } catch (error) {
      console.error('❌ Error generating predictions:', error);
      throw new Error(`Failed to generate predictions: ${error.message}`);
    }
  }

  // Create basic prediction when no historical data exists
  async createBasicPrediction(targetDate, targetHour, existingPrediction = null) {
    try {
      console.log('🎯 Creating basic prediction (no historical data available)');
      
      const availableMenuItems = await MenuItem.find({ isAvailable: true }).lean();
      if (availableMenuItems.length === 0) {
        throw new Error('No available menu items for prediction');
      }

      const predictions = [];
      const isPeakHour = this.isPeakHour(targetHour);
      const dayOfWeek = new Date(targetDate).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Select top items (limit to prevent overwhelming predictions)
      const itemsToPredict = availableMenuItems.slice(0, Math.min(12, availableMenuItems.length));

      for (const item of itemsToPredict) {
        let baseQuantity = this.getBaseCategoryQuantity(item.category);
        
        // Adjust for peak hours and weekends
        if (isPeakHour) baseQuantity *= 1.5;
        if (isWeekend) baseQuantity *= 1.2;
        
        // Add randomness
        baseQuantity *= (0.7 + Math.random() * 0.6); // ±30% variation
        
        const predictedQuantity = Math.max(0, Math.round(baseQuantity));
        
        if (predictedQuantity > 0) {
          predictions.push({
            menuItem: item._id,
            predictedQuantity,
            confidence: 0.4,
            factors: [
              { factor: 'time_based_estimate', impact: isPeakHour ? 3.0 : 2.0 },
              { factor: 'category_factor', impact: 2.0 },
              { factor: 'weekend_factor', impact: isWeekend ? 2.5 : 2.0 }
            ]
          });
        }
      }

      const totalPredictedOrders = predictions.reduce((sum, p) => sum + p.predictedQuantity, 0);
      const totalPredictedRevenue = Math.round(
        predictions.reduce((sum, p) => {
          const item = availableMenuItems.find(mi => mi._id.toString() === p.menuItem.toString());
          return sum + (item?.price || 100) * p.predictedQuantity;
        }, 0)
      );

      const weatherData = await this.getWeatherData(targetDate);

      let predictionDoc;
      if (existingPrediction) {
        predictionDoc = await Prediction.findByIdAndUpdate(
          existingPrediction._id,
          {
            predictions,
            totalPredictedOrders,
            totalPredictedRevenue,
            weatherData,
            isHoliday: this.isHoliday(targetDate)
          },
          { new: true }
        );
      } else {
        predictionDoc = new Prediction({
          predictionFor: targetDate,
          hour: targetHour,
          predictions,
          totalPredictedOrders,
          totalPredictedRevenue,
          weatherData,
          isHoliday: this.isHoliday(targetDate)
        });
        await predictionDoc.save();
      }

      console.log(`✅ Created basic prediction with ${predictions.length} items (${totalPredictedOrders} orders)`);
      return predictionDoc;
    } catch (error) {
      console.error('❌ Error creating basic prediction:', error);
      throw error;
    }
  }

  // Helper function to get base quantity by category
  getBaseCategoryQuantity(category) {
    const categoryMultipliers = {
      'appetizer': 2,
      'starter': 2,
      'main': 3,
      'main course': 3,
      'dessert': 1.5,
      'beverage': 4,
      'drink': 4,
      'snack': 2.5,
      'special': 1,
      'combo': 2,
      'default': 2
    };

    const normalizedCategory = (category || 'default').toLowerCase();
    return categoryMultipliers[normalizedCategory] || categoryMultipliers.default;
  }

  // Check if hour is peak time
  isPeakHour(hour) {
    return (hour >= 7 && hour <= 10) ||   // Breakfast
           (hour >= 12 && hour <= 15) ||  // Lunch
           (hour >= 18 && hour <= 22);    // Dinner
  }

  // Calculate trend multiplier based on various factors
  calculateTrendMultiplier(date, dayOfWeek, hour) {
    const now = new Date();
    const targetDate = new Date(date);
    const daysDiff = Math.floor((targetDate - now) / (1000 * 60 * 60 * 24));
    
    // Base multiplier
    let multiplier = 1.0;
    
    // Weekend boost
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier *= 1.2;
    }
    
    // Peak hours boost
    if (this.isPeakHour(hour)) {
      if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21)) {
        multiplier *= 1.4; // Major meal times
      } else {
        multiplier *= 1.2; // Minor meal times
      }
    }
    
    // Future date adjustment (slight decrease for far future)
    if (daysDiff > 0) {
      multiplier *= Math.max(0.8, 1 - (daysDiff * 0.02));
    }
    
    return Math.max(0.5, Math.min(2.0, multiplier));
  }

  // Calculate seasonal multiplier
  calculateSeasonalMultiplier(date) {
    const month = new Date(date).getMonth();
    const seasonalFactors = {
      0: 0.9,   // January
      1: 0.95,  // February
      2: 1.0,   // March
      3: 1.1,   // April
      4: 1.2,   // May
      5: 1.3,   // June - Peak summer
      6: 1.25,  // July
      7: 1.2,   // August
      8: 1.1,   // September
      9: 1.05,  // October
      10: 1.15, // November - Festival season
      11: 1.3   // December - Holiday season
    };
    
    return seasonalFactors[month] || 1.0;
  }

  // Get weather multiplier
  async getWeatherMultiplier(date) {
    const weather = await this.getWeatherData(date);
    const multipliers = {
      sunny: 1.1,
      rainy: 1.3,   // People order more during rain
      cloudy: 1.0,
      stormy: 1.4   // Highest multiplier for stormy weather
    };
    
    return multipliers[weather.condition] || 1.0;
  }

  // Generate realistic weather data (in production, this would call a real weather API)
  async getWeatherData(date) {
    const conditions = ['sunny', 'rainy', 'cloudy', 'stormy'];
    const weights = [0.4, 0.3, 0.2, 0.1]; // Weighted probability
    
    let randomValue = Math.random();
    let selectedCondition = 'sunny';
    
    for (let i = 0; i < conditions.length; i++) {
      if (randomValue <= weights[i]) {
        selectedCondition = conditions[i];
        break;
      }
      randomValue -= weights[i];
    }
    
    // Temperature varies by season
    const month = new Date(date).getMonth();
    let baseTemp = 25; // Default temperature
    
    if (month >= 3 && month <= 5) baseTemp = 30; // Summer
    else if (month >= 6 && month <= 9) baseTemp = 28; // Monsoon
    else if (month >= 10 && month <= 2) baseTemp = 22; // Winter
    
    return {
      temperature: Math.floor(baseTemp + (Math.random() * 10 - 5)), // ±5°C variation
      condition: selectedCondition,
      humidity: Math.floor(40 + Math.random() * 40) // 40-80% humidity
    };
  }

  // Check if date is a holiday
  isHoliday(date) {
    const dateString = new Date(date).toISOString().split('T')[0];
    const holidays = [
      '2024-01-01', '2024-01-26', '2024-03-08', '2024-03-29', // New Year, Republic Day, Holi, Good Friday
      '2024-08-15', '2024-10-02', '2024-10-31', '2024-11-01', // Independence Day, Gandhi Jayanti, Diwali period
      '2024-12-25', // Christmas
      '2025-01-01', '2025-01-26', '2025-03-14', '2025-04-18', // Next year dates
      '2025-08-15', '2025-10-02', '2025-10-20', '2025-11-07',
      '2025-12-25'
    ];
    
    return holidays.includes(dateString);
  }

  // Update prediction accuracy after actual data is available
  async updatePredictionAccuracy(predictionId, actualOrders) {
    try {
      const prediction = await Prediction.findById(predictionId);
      if (!prediction || !prediction.predictions) {
        console.warn('⚠️ Prediction not found or has no predictions');
        return;
      }

      let totalAccuracy = 0;
      let itemCount = 0;

      for (const pred of prediction.predictions) {
        const actual = actualOrders.find(o => 
          o.menuItem && o.menuItem.toString() === pred.menuItem.toString()
        );
        
        const actualQuantity = actual ? actual.quantity : 0;
        const predictedQuantity = pred.predictedQuantity || 0;
        
        // Calculate accuracy using Mean Absolute Percentage Error (MAPE) approach
        const maxQuantity = Math.max(predictedQuantity, actualQuantity, 1);
        const error = Math.abs(predictedQuantity - actualQuantity);
        const accuracy = Math.max(0, 1 - (error / maxQuantity));
        
        totalAccuracy += accuracy;
        itemCount++;
      }

      if (itemCount > 0) {
        const overallAccuracy = totalAccuracy / itemCount;
        prediction.accuracy = Math.round(overallAccuracy * 1000) / 1000; // Round to 3 decimals
        await prediction.save();
        
        console.log(`✅ Updated prediction accuracy: ${(prediction.accuracy * 100).toFixed(1)}% for prediction ${predictionId}`);
        return prediction.accuracy;
      }
    } catch (error) {
      console.error('❌ Error updating prediction accuracy:', error);
    }
  }

  // Get prediction statistics
  async getPredictionStats() {
    try {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const stats = await Prediction.aggregate([
        {
          $match: {
            createdAt: { $gte: lastWeek },
            accuracy: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            avgAccuracy: { $avg: '$accuracy' },
            totalPredictions: { $sum: 1 },
            avgOrders: { $avg: '$totalPredictedOrders' },
            avgRevenue: { $avg: '$totalPredictedRevenue' }
          }
        }
      ]);

      return stats[0] || {
        avgAccuracy: 0,
        totalPredictions: 0,
        avgOrders: 0,
        avgRevenue: 0
      };
    } catch (error) {
      console.error('❌ Error getting prediction stats:', error);
      return null;
    }
  }
}

// Export singleton instance
const predictionServiceInstance = new PredictionService();
module.exports = predictionServiceInstance;

// Also export the class for testing
module.exports.PredictionService = PredictionService;