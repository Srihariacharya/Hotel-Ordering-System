// Backend/middleware/predictionErrorHandler.js
const predictionErrorHandler = (err, req, res, next) => {
  console.error('🚨 Prediction Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // MongoDB/Mongoose errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'The provided ID is not valid'
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate entry',
      message: 'A record with this data already exists'
    });
  }

  // Prediction-specific errors
  if (err.message?.includes('historical data')) {
    return res.status(400).json({
      error: 'Insufficient Data',
      message: 'Not enough historical data to generate accurate predictions',
      suggestion: 'Please ensure you have order history before training the model'
    });
  }

  if (err.message?.includes('menu items')) {
    return res.status(400).json({
      error: 'No Menu Items',
      message: 'No menu items available for prediction',
      suggestion: 'Please add menu items before generating predictions'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong with the prediction system',
    timestamp: new Date().toISOString()
  });
};

module.exports = predictionErrorHandler;