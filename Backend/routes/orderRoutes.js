const express = require('express');
const router  = express.Router();

const {
  placeOrder,
  getMyOrders,
  listOrders,
  updateOrderStatus
} = require('../controllers/orderController');

const { protect } = require('../middleware/authMiddleware');

router.post('/', protect('waiter', 'admin'), placeOrder);


router.get('/my', protect(), getMyOrders);


router.get('/', protect('waiter', 'admin'), listOrders);


router.put('/:id', protect('waiter', 'admin'), updateOrderStatus);

module.exports = router;
