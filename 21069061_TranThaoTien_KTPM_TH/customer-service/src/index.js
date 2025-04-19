const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const customerRoutes = require('./routes/customerRoutes');
const rabbitmqService = require('./services/rabbitmqService');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/customer-service')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// RabbitMQ connection
rabbitmqService.connect()
  .then(() => {
    console.log('Connected to RabbitMQ');
    
    // Subscribe to order events
    rabbitmqService.consume(rabbitmqService.queues.orderCreated, (order) => {
      console.log('Order created:', order);
      // Handle order creation in customer service if needed
    });

    rabbitmqService.consume(rabbitmqService.queues.orderUpdated, (order) => {
      console.log('Order updated:', order);
      // Handle order update in customer service if needed
    });

    rabbitmqService.consume(rabbitmqService.queues.orderCancelled, (order) => {
      console.log('Order cancelled:', order);
      // Handle order cancellation in customer service if needed
    });
  })
  .catch(err => console.error('RabbitMQ connection error:', err));

// Routes
app.use('/api/customers', customerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Customer Service is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Customer Service running on port ${PORT}`);
}); 