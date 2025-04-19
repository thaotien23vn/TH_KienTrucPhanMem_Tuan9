const Inventory = require('../models/inventory');
const CircuitBreaker = require('opossum');
const retry = require('async-retry');

// Circuit breaker configuration
const breaker = new CircuitBreaker(async function updateInventory(inventoryData) {
  return await _updateInventory(inventoryData);
}, {
  timeout: 5000, // Time in ms before the circuit breaker times out
  errorThresholdPercentage: 50, // Error percentage at which to open the circuit
  resetTimeout: 30000, // Time to wait before allowing another request
});

// Event listeners for the circuit breaker
breaker.on('open', () => console.log('Circuit breaker opened - Inventory service is unavailable'));
breaker.on('close', () => console.log('Circuit breaker closed - Inventory service is operational'));
breaker.on('halfOpen', () => console.log('Circuit breaker half-open - Testing inventory service'));
breaker.on('fallback', () => console.log('Circuit breaker fallback - Using fallback method'));

// Retry configuration
const retryOptions = {
  retries: 3, // Number of retries
  factor: 2, // Exponential backoff factor
  minTimeout: 1000, // Minimum timeout between retries
  maxTimeout: 5000, // Maximum timeout between retries
  randomize: true // Randomize timeouts
};

// Update inventory function with simulated failures for testing
async function _updateInventory({ productId, quantity, operation }) {
  // Simulating random failures for testing fault tolerance
  if (Math.random() < 0.1) { // 10% failure rate
    throw new Error('Random inventory update failure');
  }
  
  const inventory = await Inventory.findOne({ productId });
  
  if (!inventory) {
    throw new Error(`Inventory record not found for product ${productId}`);
  }
  
  if (operation === 'increment') {
    inventory.quantity += quantity;
  } else if (operation === 'decrement') {
    if (inventory.quantity < quantity) {
      throw new Error(`Insufficient inventory for product ${productId}`);
    }
    inventory.quantity -= quantity;
  } else if (operation === 'reserve') {
    if (inventory.availableQuantity < quantity) {
      throw new Error(`Insufficient available inventory for product ${productId}`);
    }
    inventory.reservedQuantity += quantity;
  } else if (operation === 'release') {
    inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - quantity);
  } else {
    throw new Error('Invalid inventory operation');
  }
  
  inventory.lastUpdated = new Date();
  await inventory.save();
  
  return inventory;
}

// Public methods with fault tolerance
const inventoryService = {
  // Create a new inventory record
  async createInventory(inventoryData) {
    try {
      const inventory = new Inventory(inventoryData);
      await inventory.save();
      return inventory;
    } catch (error) {
      console.error('Error creating inventory record:', error);
      throw error;
    }
  },
  
  // Get inventory by product ID
  async getInventoryByProductId(productId) {
    return await Inventory.findOne({ productId });
  },
  
  // Update inventory with circuit breaker and retry
  async updateInventory(productId, quantity, operation) {
    try {
      // Try to update inventory with circuit breaker and retry
      return await retry(async () => {
        return await breaker.fire({
          productId,
          quantity,
          operation
        });
      }, retryOptions);
    } catch (error) {
      console.error('Inventory update failed:', error);
      throw error;
    }
  },
  
  // Reserve inventory for an order
  async reserveInventory(productId, quantity) {
    return await this.updateInventory(productId, quantity, 'reserve');
  },
  
  // Release reserved inventory
  async releaseReservedInventory(productId, quantity) {
    return await this.updateInventory(productId, quantity, 'release');
  },
  
  // Confirm inventory deduction after successful payment
  async confirmInventoryDeduction(productId, quantity) {
    const inventory = await this.getInventoryByProductId(productId);
    
    if (!inventory) {
      throw new Error(`Inventory record not found for product ${productId}`);
    }
    
    // Decrease reserved quantity
    await this.updateInventory(productId, quantity, 'release');
    
    // Decrease actual quantity
    return await this.updateInventory(productId, quantity, 'decrement');
  },
  
  // Restock inventory
  async restockInventory(productId, quantity) {
    return await this.updateInventory(productId, quantity, 'increment');
  },
  
  // Get all low stock items
  async getLowStockItems() {
    const inventories = await Inventory.find();
    return inventories.filter(inventory => inventory.isLowStock());
  }
};

module.exports = inventoryService; 