const express = require('express');
const router = express.Router();
const shippingService = require('../services/shipping');
const { sendShippingUpdatedMessage, sendShippingStatusMessage } = require('../services/messageQueue');

// Create a new shipping record
router.post('/', async (req, res) => {
  try {
    const shipping = await shippingService.createShipping(req.body);
    await sendShippingUpdatedMessage(shipping);
    res.status(201).json(shipping);
  } catch (error) {
    console.error('Error creating shipping record:', error);
    res.status(500).json({ message: 'Failed to create shipping record', error: error.message });
  }
});

// Get shipping by ID
router.get('/:id', async (req, res) => {
  try {
    const shipping = await shippingService.getShippingById(req.params.id);
    
    if (!shipping) {
      return res.status(404).json({ message: 'Shipping record not found' });
    }
    
    res.json(shipping);
  } catch (error) {
    console.error('Error fetching shipping:', error);
    res.status(500).json({ message: 'Failed to fetch shipping', error: error.message });
  }
});

// Get shipping by order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const shipping = await shippingService.getShippingByOrderId(req.params.orderId);
    
    if (!shipping) {
      return res.status(404).json({ message: 'Shipping record not found for this order' });
    }
    
    res.json(shipping);
  } catch (error) {
    console.error('Error fetching shipping by order ID:', error);
    res.status(500).json({ message: 'Failed to fetch shipping', error: error.message });
  }
});

// Update shipping status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, location, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const shipping = await shippingService.updateShippingStatus(
      req.params.id,
      status,
      location || '',
      notes || ''
    );
    
    await sendShippingUpdatedMessage(shipping);
    await sendShippingStatusMessage(shipping);
    
    res.json(shipping);
  } catch (error) {
    console.error('Error updating shipping status:', error);
    res.status(500).json({ message: 'Failed to update shipping status', error: error.message });
  }
});

// Mark shipping as shipped
router.put('/:id/ship', async (req, res) => {
  try {
    const { trackingNumber, carrier, location } = req.body;
    
    const shipping = await shippingService.markAsShipped(
      req.params.id,
      trackingNumber,
      carrier,
      location
    );
    
    await sendShippingUpdatedMessage(shipping);
    await sendShippingStatusMessage(shipping);
    
    res.json(shipping);
  } catch (error) {
    console.error('Error marking shipping as shipped:', error);
    res.status(500).json({ message: 'Failed to mark shipping as shipped', error: error.message });
  }
});

// Mark shipping as delivered
router.put('/:id/deliver', async (req, res) => {
  try {
    const { location, notes } = req.body;
    
    const shipping = await shippingService.markAsDelivered(
      req.params.id,
      location,
      notes
    );
    
    await sendShippingUpdatedMessage(shipping);
    await sendShippingStatusMessage(shipping);
    
    res.json(shipping);
  } catch (error) {
    console.error('Error marking shipping as delivered:', error);
    res.status(500).json({ message: 'Failed to mark shipping as delivered', error: error.message });
  }
});

// Cancel shipping
router.put('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }
    
    const shipping = await shippingService.cancelShipping(
      req.params.id,
      reason
    );
    
    await sendShippingUpdatedMessage(shipping);
    
    res.json(shipping);
  } catch (error) {
    console.error('Error cancelling shipping:', error);
    res.status(500).json({ message: 'Failed to cancel shipping', error: error.message });
  }
});

// Update tracking information
router.put('/:id/tracking', async (req, res) => {
  try {
    const { status, location, notes } = req.body;
    
    if (!status || !location) {
      return res.status(400).json({ message: 'Status and location are required' });
    }
    
    const shipping = await shippingService.updateTrackingInfo(
      req.params.id,
      status,
      location,
      notes || ''
    );
    
    await sendShippingStatusMessage(shipping);
    
    res.json(shipping);
  } catch (error) {
    console.error('Error updating tracking information:', error);
    res.status(500).json({ message: 'Failed to update tracking information', error: error.message });
  }
});

module.exports = router; 