const mongoose = require('mongoose');
require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cremation-poa-db')
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
}

module.exports = app;
