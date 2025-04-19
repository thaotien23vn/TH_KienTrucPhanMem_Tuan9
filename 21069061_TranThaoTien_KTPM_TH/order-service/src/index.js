const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const orderRoutes = require('./routes/orderRoutes');
const rabbitmqService = require('./services/rabbitmqService');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/order-service')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// RabbitMQ connection
rabbitmqService.connect()
  .then(() => {
    console.log('Connected to RabbitMQ');
    
    // Subscribe to product events
    rabbitmqService.consume(rabbitmqService.queues.productCreated, (product) => {
      console.log('Product created:', product);
      // Handle product creation in order service if needed
    });

    rabbitmqService.consume(rabbitmqService.queues.productUpdated, (product) => {
      console.log('Product updated:', product);
      // Handle product update in order service if needed
    });

    rabbitmqService.consume(rabbitmqService.queues.productDeleted, (product) => {
      console.log('Product deleted:', product);
      // Handle product deletion in order service if needed
    });
  })
  .catch(err => console.error('RabbitMQ connection error:', err));

// Routes
app.use('/api/orders', orderRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Order Service is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
}); 