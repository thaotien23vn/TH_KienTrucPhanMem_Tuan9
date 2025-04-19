const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const amqp = require('amqplib');
const { setupMessageQueue } = require('./services/messageQueue');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'payment-service' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-service')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Message queue setup
const setupService = async () => {
  try {
    await setupMessageQueue();
    console.log('Message queue setup completed');
  } catch (error) {
    console.error('Error setting up message queue:', error);
  }
};

// Start server
app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
  setupService();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
}); 