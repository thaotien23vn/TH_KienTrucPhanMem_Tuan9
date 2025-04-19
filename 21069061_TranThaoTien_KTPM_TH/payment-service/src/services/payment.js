const Payment = require('../models/payment');
const CircuitBreaker = require('opossum');
const retry = require('async-retry');

// Circuit breaker configuration
const breaker = new CircuitBreaker(async function processPayment(paymentData) {
  return await _processPayment(paymentData);
}, {
  timeout: 5000, // Time in ms before the circuit breaker times out
  errorThresholdPercentage: 50, // Error percentage at which to open the circuit
  resetTimeout: 30000, // Time to wait before allowing another request
  rollingCountTimeout: 10000, // Rolling window time in ms
  rollingCountBuckets: 10 // How many buckets the rolling window is divided into
});

// Event listeners for the circuit breaker
breaker.on('open', () => console.log('Circuit breaker opened - Payment service is unavailable'));
breaker.on('close', () => console.log('Circuit breaker closed - Payment service is operational'));
breaker.on('halfOpen', () => console.log('Circuit breaker half-open - Testing payment service'));
breaker.on('fallback', () => console.log('Circuit breaker fallback - Using fallback method'));

// Retry configuration
const retryOptions = {
  retries: 3, // Number of retries
  factor: 2, // Exponential backoff factor
  minTimeout: 1000, // Minimum timeout between retries
  maxTimeout: 5000, // Maximum timeout between retries
  randomize: true // Randomize timeouts
};

// Process payment with retry mechanism
async function _processPayment(paymentData) {
  // In a real-world scenario, this would integrate with a payment gateway
  // Simulating payment processing with a random success/failure
  return new Promise((resolve, reject) => {
    const isSuccessful = Math.random() > 0.2; // 80% success rate for simulation
    
    setTimeout(() => {
      if (isSuccessful) {
        resolve({
          success: true,
          transactionId: `tx_${Date.now()}`,
          status: 'completed'
        });
      } else {
        reject(new Error('Payment processing failed'));
      }
    }, 500); // Simulate processing time
  });
}

// Public methods with fault tolerance
const paymentService = {
  // Create a new payment
  async createPayment(paymentData) {
    try {
      const payment = new Payment(paymentData);
      await payment.save();
      return payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  // Process a payment with circuit breaker and retry
  async processPayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      if (payment.status !== 'pending') {
        return payment;
      }
      
      // Try to process payment with circuit breaker and retry
      const result = await retry(async () => {
        return await breaker.fire({
          orderId: payment.orderId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod
        });
      }, retryOptions);
      
      // Update payment with result
      payment.status = result.status;
      payment.transactionId = result.transactionId;
      payment.metadata.processedAt = new Date();
      
      await payment.save();
      return payment;
    } catch (error) {
      console.error('Payment processing failed:', error);
      
      // Update payment status to failed
      if (payment) {
        payment.status = 'failed';
        payment.metadata.error = error.message;
        await payment.save();
      }
      
      throw error;
    }
  },

  // Refund a payment
  async refundPayment(paymentId, reason) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      if (payment.status !== 'completed') {
        throw new Error('Cannot refund a payment that is not completed');
      }
      
      // In a real-world scenario, this would call the payment gateway's refund API
      
      payment.status = 'refunded';
      payment.metadata.refundReason = reason;
      payment.metadata.refundedAt = new Date();
      
      await payment.save();
      return payment;
    } catch (error) {
      console.error('Payment refund failed:', error);
      throw error;
    }
  },

  // Get payment by ID
  async getPaymentById(paymentId) {
    return await Payment.findById(paymentId);
  },

  // Get payments by order ID
  async getPaymentByOrderId(orderId) {
    return await Payment.findOne({ orderId });
  }
};

module.exports = paymentService; 