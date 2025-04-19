const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { setupMessageQueue } = require('./services/messageQueue');
const inventoryRoutes = require('./routes/inventory');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/inventory', inventoryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'inventory-service' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory-service')
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
  console.log(`Inventory Service running on port ${PORT}`);
  setupService();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
}); 