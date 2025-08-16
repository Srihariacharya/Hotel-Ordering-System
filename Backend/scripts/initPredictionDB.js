// Backend/scripts/initPredictionDB.js
const mongoose = require('mongoose');
require('dotenv').config();

const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const PredictionData = require('../models/PredictionData');
const Prediction = require('../models/Prediction');

/**
 * Initialize the prediction database:
 * 1️⃣ Ensure menu items exist
 * 2️⃣ Generate sample orders if none
 * 3️⃣ Initialize prediction collections
 * 4️⃣ Create indexes
 */
async function initializePredictionDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ---------------------------
    // 1️⃣ Check Menu Items
    // ---------------------------
    const menuItemsCount = await MenuItem.countDocuments();
    console.log(`📊 Found ${menuItemsCount} menu items`);

    if (menuItemsCount === 0) {
      console.warn('⚠️ No menu items found. Please add menu items before initializing predictions.');
      return { menuItems: 0, orders: 0, predictionData: 0, predictions: 0 };
    }

    // ---------------------------
    // 2️⃣ Generate Sample Orders if none
    // ---------------------------
    const ordersCount = await Order.countDocuments();
    console.log(`📊 Found ${ordersCount} existing orders`);

    if (ordersCount === 0) {
      console.log('⚠️ No orders found. Creating sample orders for training...');
      await createSampleOrders();
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

    return {
      menuItems: await MenuItem.countDocuments(),
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
 * Create sample orders for the past 30 days
 * Uses only existing menu items from the database
 */
async function createSampleOrders() {
  const menuItems = await MenuItem.find({ isAvailable: true });
  if (!menuItems.length) {
    console.warn('⚠️ No available menu items found. Cannot create sample orders.');
    return;
  }

  const orders = [];
  const now = new Date();

  for (let day = 30; day >= 0; day--) {
    const orderDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const ordersPerDay = Math.floor(Math.random() * 11) + 5; // 5-15 orders/day

    for (let orderIndex = 0; orderIndex < ordersPerDay; orderIndex++) {
      const hour = Math.floor(Math.random() * 14) + 8; // 8AM-10PM
      const orderTime = new Date(orderDate);
      orderTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      // Random 1-3 menu items per order
      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedItems = [...menuItems].sort(() => 0.5 - Math.random()).slice(0, numItems);

      let totalAmount = 0;
      const orderItems = selectedItems.map(item => {
        const quantity = Math.floor(Math.random() * 3) + 1;
        totalAmount += item.price * quantity;
        return {
          menuItem: item._id,
          quantity,
          price: item.price
        };
      });

      orders.push({
        customerInfo: {
          name: `Customer ${orderIndex + 1}`,
          phone: `98765${Math.floor(Math.random() * 90000) + 10000}`,
          roomNumber: Math.floor(Math.random() * 200) + 100
        },
        items: orderItems,
        totalAmount,
        status: 'delivered',
        createdAt: orderTime
      });
    }
  }

  await Order.insertMany(orders);
  console.log(`✅ Created ${orders.length} sample orders`);
}

/**
 * Create database indexes for faster queries
 */
async function createIndexes() {
  try {
    await Prediction.createIndexes();
    await PredictionData.collection.createIndex({ date: 1, hour: 1 });
    await PredictionData.collection.createIndex({ dayOfWeek: 1 });
    await Order.collection.createIndex({ createdAt: 1 });
    await Order.collection.createIndex({ 'items.menuItem': 1 });

    console.log('✅ Created database indexes');
  } catch (error) {
    console.warn('⚠️ Index creation failed:', error.message);
  }
}

// ---------------------------
// Run as script or import
// ---------------------------
if (require.main === module) {
  initializePredictionDatabase()
    .then(stats => console.log('📊 Final stats:', stats))
    .catch(error => console.error('💥 Initialization failed:', error));
}

module.exports = { initializePredictionDatabase };
