const mongoose = require('mongoose');

const shippingSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: String,
    required: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    sparse: true
  },
  carrier: {
    type: String,
    default: 'default-carrier'
  },
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight'],
    default: 'standard'
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  history: [{
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: String,
    notes: String
  }],
  packageDetails: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    numberOfPackages: {
      type: Number,
      default: 1
    }
  }
}, { timestamps: true });

// Method to update shipping status
shippingSchema.methods.updateStatus = function(status, location, notes) {
  this.status = status;
  
  this.history.push({
    status,
    timestamp: new Date(),
    location,
    notes
  });
  
  if (status === 'shipped') {
    this.trackingNumber = this.trackingNumber || `TRK${Date.now().toString().slice(-8)}`;
    
    // Set estimated delivery date based on shipping method
    const today = new Date();
    
    if (this.shippingMethod === 'standard') {
      this.estimatedDelivery = new Date(today.setDate(today.getDate() + 5));
    } else if (this.shippingMethod === 'express') {
      this.estimatedDelivery = new Date(today.setDate(today.getDate() + 2));
    } else if (this.shippingMethod === 'overnight') {
      this.estimatedDelivery = new Date(today.setDate(today.getDate() + 1));
    }
  }
  
  if (status === 'delivered') {
    this.actualDelivery = new Date();
  }
};

module.exports = mongoose.model('Shipping', shippingSchema); 