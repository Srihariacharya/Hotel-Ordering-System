// Backend/scripts/initPredictionDB.js - UPDATED to use existing menu items
const mongoose = require('mongoose');
require('dotenv').config();

const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const PredictionData = require('../models/PredictionData');
const Prediction = require('../models/Prediction');

/**
 * Initialize the prediction database:
 * 1️⃣ Use existing menu items from your Atlas DB
 * 2️⃣ Generate sample orders if none exist
 * 3️⃣ Initialize prediction collections
 * 4️⃣ Create indexes
 */
async function initializePredictionDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // ---------------------------
    // 1️⃣ Check Your Existing Menu Items
    // ---------------------------
    const menuItemsCount = await MenuItem.countDocuments();
    const availableMenuItems = await MenuItem.countDocuments({ isAvailable: true });
    console.log(`📊 Found ${menuItemsCount} menu items (${availableMenuItems} available)`);

    if (menuItemsCount === 0) {
      console.warn('⚠️ No menu items found in your database. Please add menu items first!');
      console.log('💡 Add menu items through your admin interface, then run this script again.');
      return { menuItems: 0, orders: 0, predictionData: 0, predictions: 0 };
    }

    // Show sample of your existing menu items
    const sampleMenuItems = await MenuItem.find({ isAvailable: true }).limit(5).select('name price category');
    console.log('🍽️ Your existing menu items (sample):');
    sampleMenuItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} - ₹${item.price} (${item.category})`);
    });

    if (availableMenuItems === 0) {
      console.warn('⚠️ No available menu items found. Marking some items as available...');
      await MenuItem.updateMany({}, { isAvailable: true }, { limit: 10 });
      console.log('✅ Updated menu items to be available');
    }

    // ---------------------------
    // 2️⃣ Generate Sample Orders using YOUR menu items
    // ---------------------------
    const ordersCount = await Order.countDocuments();
    console.log(`📊 Found ${ordersCount} existing orders`);

    if (ordersCount === 0) {
      console.log('⚡ No orders found. Creating sample orders using your menu items...');
      const createdOrders = await createSampleOrdersFromYourMenu();
      console.log(`✅ Created ${createdOrders} sample orders`);
    } else {
      console.log('✅ Using existing orders for training data');
    }

    // ---------------------------
    // 3️⃣ Initialize Prediction Collections
    // ---------------------------
    await PredictionData.init();
    await Prediction.init();
    console.log('✅ Prediction collections initialized');

    // ---------------------------
    // 4️⃣ Create Indexes
    // ---------------------------
    await createIndexes();

    console.log('🎉 Prediction database initialization completed!');
    console.log('💡 Next steps:');
    console.log('   1. POST /predictions/train - to train the model');
    console.log('   2. GET /predictions/current - to get predictions');

    return {
      menuItems: await MenuItem.countDocuments(),
      availableMenuItems: await MenuItem.countDocuments({ isAvailable: true }),
      orders: await Order.countDocuments(),
      predictionData: await PredictionData.countDocuments(),
      predictions: await Prediction.countDocuments()
    };
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    mongoose.connection.close();
  }
}

/**
 * Create sample orders using YOUR EXISTING menu items
 */
async function createSampleOrdersFromYourMenu() {
  const menuItems = await MenuItem.find({ isAvailable: true });
  if (!menuItems.length) {
    console.warn('⚠️ No available menu items found. Cannot create sample orders.');
    return 0;
  }

  console.log(`🔄 Creating sample orders using ${menuItems.length} of your menu items...`);

  const orders = [];
  const now = new Date();

  // Create orders for the past 30 days
  for (let day = 30; day >= 0; day--) {
    const orderDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const ordersPerDay = Math.floor(Math.random() * 15) + 8; // 8-22 orders/day

    for (let orderIndex = 0; orderIndex < ordersPerDay; orderIndex++) {
      // Weight towards meal times (breakfast: 8-10, lunch: 12-15, dinner: 19-22)
      const mealTimes = [
        { hours: [8, 9, 10], weight: 0.2 },      // Breakfast
        { hours: [12, 13, 14, 15], weight: 0.4 }, // Lunch (most popular)
        { hours: [19, 20, 21, 22], weight: 0.3 }, // Dinner
        { hours: [11, 16, 17, 18], weight: 0.1 }  // Snack times
      ];

      const randomWeight = Math.random();
      let selectedHours;
      
      if (randomWeight < 0.4) selectedHours = mealTimes[1].hours; // Lunch
      else if (randomWeight < 0.7) selectedHours = mealTimes[2].hours; // Dinner
      else if (randomWeight < 0.9) selectedHours = mealTimes[0].hours; // Breakfast
      else selectedHours = mealTimes[3].hours; // Snacks

      const hour = selectedHours[Math.floor(Math.random() * selectedHours.length)];
      const orderTime = new Date(orderDate);
      orderTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      // Random 1-4 items per order, with realistic combinations
      const numItems = Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? 2 : Math.random() < 0.95 ? 3 : 4;
      
      // Select items from your menu
      const selectedItems = [...menuItems]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(numItems, menuItems.length));

      let totalAmount = 0;
      const orderItems = selectedItems.map(item => {
        // Most orders are single quantity, some are 2-3
        const quantity = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3;
        totalAmount += item.price * quantity;
        return {
          menuItem: item._id,
          quantity,
          price: item.price
        };
      });

      orders.push({
        customerInfo: {
          name: `Guest ${String(Math.floor(Math.random() * 900) + 100)}`,
          phone: `98${Math.floor(Math.random() * 90000000) + 10000000}`,
          roomNumber: Math.floor(Math.random() * 400) + 101 // Rooms 101-500
        },
        items: orderItems,
        totalAmount,
        status: Math.random() < 0.95 ? 'delivered' : 'cancelled', // 95% delivered
        createdAt: orderTime
      });
    }
  }

  // Insert in batches to avoid memory issues
  const batchSize = 100;
  let insertedCount = 0;
  
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    await Order.insertMany(batch);
    insertedCount += batch.length;
    console.log(`📝 Inserted ${insertedCount}/${orders.length} orders...`);
  }

  console.log(`✅ Successfully created ${orders.length} sample orders using your menu items`);
  return orders.length;
}

/**
 * Create database indexes for faster queries
 */
async function createIndexes() {
  try {
    // Handle index creation more carefully
    console.log('🔧 Creating database indexes...');
    
    // Check existing indexes first
    const existingIndexes = await Prediction.collection.getIndexes();
    console.log('📋 Existing prediction indexes:', Object.keys(existingIndexes));
    
    // Only create indexes that don't exist
    try {
      await PredictionData.collection.createIndex({ date: 1, hour: 1 });
    } catch (err) {
      if (!err.message.includes('already exists')) console.warn('PredictionData index warning:', err.message);
    }
    
    try {
      await PredictionData.collection.createIndex({ dayOfWeek: 1 });
    } catch (err) {
      if (!err.message.includes('already exists')) console.warn('PredictionData dayOfWeek index warning:', err.message);
    }
    
    try {
      await Order.collection.createIndex({ createdAt: 1 });
    } catch (err) {
      if (!err.message.includes('already exists')) console.warn('Order createdAt index warning:', err.message);
    }
    
    try {
      await Order.collection.createIndex({ 'items.menuItem': 1 });
    } catch (err) {
      if (!err.message.includes('already exists')) console.warn('Order items index warning:', err.message);
    }
    
    try {
      await MenuItem.collection.createIndex({ isAvailable: 1 });
    } catch (err) {
      if (!err.message.includes('already exists')) console.warn('MenuItem isAvailable index warning:', err.message);
    }

    console.log('✅ Database indexes handled successfully');
  } catch (error) {
    console.warn('⚠️ Index creation had some issues (this is usually fine):', error.message);
  }
}

// ---------------------------
// Run as script or import
// ---------------------------
if (require.main === module) {
  initializePredictionDatabase()
    .then(stats => {
      console.log('\n📊 Final Statistics:');
      console.log('===================');
      console.log(`Menu Items: ${stats.menuItems} (${stats.availableMenuItems} available)`);
      console.log(`Orders: ${stats.orders}`);
      console.log(`Prediction Data: ${stats.predictionData}`);
      console.log(`Predictions: ${stats.predictions}`);
      console.log('\n🎯 Ready for predictions! Try:');
      console.log('   - POST /predictions/train');
      console.log('   - GET /predictions/current');
    })
    .catch(error => console.error('💥 Initialization failed:', error));
}

module.exports = { initializePredictionDatabase };