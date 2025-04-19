const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const productRoutes = require('./routes/productRoutes');
const rabbitmqService = require('./services/rabbitmqService');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/product-service')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// RabbitMQ connection
rabbitmqService.connect()
  .then(() => console.log('Connected to RabbitMQ'))
  .catch(err => console.error('RabbitMQ connection error:', err));

// Routes
app.use('/api/products', productRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Product Service is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
}); 