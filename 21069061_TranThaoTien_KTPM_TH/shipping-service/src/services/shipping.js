const Shipping = require('../models/shipping');
const CircuitBreaker = require('opossum');
const retry = require('async-retry');

// Circuit breaker configuration
const breaker = new CircuitBreaker(async function updateShippingStatus(data) {
  return await _updateShippingStatus(data);
}, {
  timeout: 5000, // Time in ms before the circuit breaker times out
  errorThresholdPercentage: 50, // Error percentage at which to open the circuit
  resetTimeout: 30000, // Time to wait before allowing another request
});

// Event listeners for the circuit breaker
breaker.on('open', () => console.log('Circuit breaker opened - Shipping service is unavailable'));
breaker.on('close', () => console.log('Circuit breaker closed - Shipping service is operational'));
breaker.on('halfOpen', () => console.log('Circuit breaker half-open - Testing shipping service'));
breaker.on('fallback', () => console.log('Circuit breaker fallback - Using fallback method'));

// Retry configuration
const retryOptions = {
  retries: 3, // Number of retries
  factor: 2, // Exponential backoff factor
  minTimeout: 1000, // Minimum timeout between retries
  maxTimeout: 5000, // Maximum timeout between retries
  randomize: true // Randomize timeouts
};

// Update shipping status function with simulated failures for testing
async function _updateShippingStatus({ shippingId, status, location, notes }) {
  // Simulating random failures for testing fault tolerance
  if (Math.random() < 0.1) { // 10% failure rate
    throw new Error('Random shipping update failure');
  }
  
  const shipping = await Shipping.findById(shippingId);
  
  if (!shipping) {
    throw new Error(`Shipping record not found with ID ${shippingId}`);
  }
  
  shipping.updateStatus(status, location, notes);
  await shipping.save();
  
  return shipping;
}

// Public methods with fault tolerance
const shippingService = {
  // Create a new shipping record
  async createShipping(shippingData) {
    try {
      const shipping = new Shipping(shippingData);
      shipping.history.push({
        status: 'pending',
        timestamp: new Date(),
        notes: 'Shipping created'
      });
      await shipping.save();
      return shipping;
    } catch (error) {
      console.error('Error creating shipping record:', error);
      throw error;
    }
  },
  
  // Get shipping by ID
  async getShippingById(shippingId) {
    return await Shipping.findById(shippingId);
  },
  
  // Get shipping by order ID
  async getShippingByOrderId(orderId) {
    return await Shipping.findOne({ orderId });
  },
  
  // Update shipping status with circuit breaker and retry
  async updateShippingStatus(shippingId, status, location, notes) {
    try {
      // Try to update shipping status with circuit breaker and retry
      return await retry(async () => {
        return await breaker.fire({
          shippingId,
          status,
          location,
          notes
        });
      }, retryOptions);
    } catch (error) {
      console.error('Shipping status update failed:', error);
      throw error;
    }
  },
  
  // Process a shipping after payment is confirmed
  async processShipping(orderId) {
    try {
      const shipping = await this.getShippingByOrderId(orderId);
      
      if (!shipping) {
        throw new Error(`Shipping record not found for order ${orderId}`);
      }
      
      return await this.updateShippingStatus(
        shipping._id,
        'processing',
        'Distribution Center',
        'Order is being processed for shipment'
      );
    } catch (error) {
      console.error('Error processing shipping:', error);
      throw error;
    }
  },
  
  // Mark a shipping as shipped
  async markAsShipped(shippingId, trackingNumber, carrier, location) {
    try {
      const shipping = await this.getShippingById(shippingId);
      
      if (!shipping) {
        throw new Error(`Shipping record not found with ID ${shippingId}`);
      }
      
      if (trackingNumber) {
        shipping.trackingNumber = trackingNumber;
      }
      
      if (carrier) {
        shipping.carrier = carrier;
      }
      
      return await this.updateShippingStatus(
        shippingId,
        'shipped',
        location || 'Distribution Center',
        'Order has been shipped'
      );
    } catch (error) {
      console.error('Error marking shipping as shipped:', error);
      throw error;
    }
  },
  
  // Mark a shipping as delivered
  async markAsDelivered(shippingId, location, notes) {
    try {
      return await this.updateShippingStatus(
        shippingId,
        'delivered',
        location || 'Destination',
        notes || 'Order has been delivered'
      );
    } catch (error) {
      console.error('Error marking shipping as delivered:', error);
      throw error;
    }
  },
  
  // Mark a shipping as cancelled
  async cancelShipping(shippingId, reason) {
    try {
      return await this.updateShippingStatus(
        shippingId,
        'cancelled',
        'System',
        reason || 'Shipping has been cancelled'
      );
    } catch (error) {
      console.error('Error cancelling shipping:', error);
      throw error;
    }
  },
  
  // Update tracking information
  async updateTrackingInfo(shippingId, status, location, notes) {
    try {
      return await this.updateShippingStatus(
        shippingId,
        status,
        location,
        notes
      );
    } catch (error) {
      console.error('Error updating tracking information:', error);
      throw error;
    }
  }
};

module.exports = shippingService; 