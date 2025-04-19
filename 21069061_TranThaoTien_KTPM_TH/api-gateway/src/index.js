const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const timeout = require('express-timeout-handler');
const CircuitBreaker = require('opossum');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Rate limiter configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Timeout configuration
app.use(timeout.handler({
  timeout: 30000, // 30 seconds
  onTimeout: function(req, res) {
    res.status(503).json({ error: 'Service Timeout', message: 'Request took too long to process' });
  }
}));

// Circuit breaker options
const circuitBreakerOptions = {
  timeout: 5000, // Time in ms before the circuit breaker times out
  errorThresholdPercentage: 50, // Error percentage at which to open the circuit
  resetTimeout: 30000 // Time to wait before allowing another request
};

// Proxy middleware with Circuit Breaker
const createServiceProxy = (serviceUrl, pathPrefix) => {
  const breaker = new CircuitBreaker(() => Promise.resolve(true), circuitBreakerOptions);
  
  breaker.on('open', () => console.log(`Circuit breaker opened for ${pathPrefix}`));
  breaker.on('close', () => console.log(`Circuit breaker closed for ${pathPrefix}`));
  breaker.on('halfOpen', () => console.log(`Circuit breaker half-open for ${pathPrefix}`));
  
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^${pathPrefix}`]: pathPrefix
    },
    onProxyReq: (proxyReq, req, res) => {
      if (breaker.status === 'open') {
        res.status(503).json({ error: 'Service Unavailable', message: 'Service temporarily unavailable' });
        proxyReq.destroy();
      }
    },
    onError: (err, req, res) => {
      breaker.fire().catch(() => {});
      res.status(500).json({ error: 'Proxy Error', message: err.message });
    }
  });
};

// Service proxies
const productServiceProxy = createServiceProxy(process.env.PRODUCT_SERVICE_URL, '/api/products');
const orderServiceProxy = createServiceProxy(process.env.ORDER_SERVICE_URL, '/api/orders');
const customerServiceProxy = createServiceProxy(process.env.CUSTOMER_SERVICE_URL, '/api/customers');
const paymentServiceProxy = createServiceProxy(process.env.PAYMENT_SERVICE_URL, '/api/payments');
const inventoryServiceProxy = createServiceProxy(process.env.INVENTORY_SERVICE_URL, '/api/inventory');
const shippingServiceProxy = createServiceProxy(process.env.SHIPPING_SERVICE_URL, '/api/shipping');

// Routes
app.use('/api/products', productServiceProxy);
app.use('/api/orders', orderServiceProxy);
app.use('/api/customers', customerServiceProxy);
app.use('/api/payments', paymentServiceProxy);
app.use('/api/inventory', inventoryServiceProxy);
app.use('/api/shipping', shippingServiceProxy);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Gateway Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
}); 