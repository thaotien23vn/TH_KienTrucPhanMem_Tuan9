const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  location: {
    type: String,
    default: 'main-warehouse'
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Virtual for available quantity
inventorySchema.virtual('availableQuantity').get(function() {
  return Math.max(this.quantity - this.reservedQuantity, 0);
});

// Method to check if product is in stock
inventorySchema.methods.isInStock = function(requestedQuantity = 1) {
  return this.availableQuantity >= requestedQuantity;
};

// Method to check if stock is low
inventorySchema.methods.isLowStock = function() {
  return this.availableQuantity <= this.lowStockThreshold;
};

module.exports = mongoose.model('Inventory', inventorySchema); 