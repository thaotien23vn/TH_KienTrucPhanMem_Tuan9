const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment');
const { sendPaymentCompletedMessage, sendPaymentRefundedMessage } = require('../services/messageQueue');

// Create a new payment
router.post('/', async (req, res) => {
  try {
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Failed to create payment', error: error.message });
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
  }
});

// Get payment by order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const payment = await paymentService.getPaymentByOrderId(req.params.orderId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found for this order' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment by order ID:', error);
    res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
  }
});

// Process a payment
router.post('/:id/process', async (req, res) => {
  try {
    const payment = await paymentService.processPayment(req.params.id);
    
    // Send message to queue if payment was successful
    if (payment.status === 'completed') {
      await sendPaymentCompletedMessage(payment);
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Failed to process payment', error: error.message });
  }
});

// Refund a payment
router.post('/:id/refund', async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Refund reason is required' });
    }
    
    const payment = await paymentService.refundPayment(req.params.id, reason);
    
    // Send refund message to queue
    await sendPaymentRefundedMessage(payment);
    
    res.json(payment);
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ message: 'Failed to refund payment', error: error.message });
  }
});

module.exports = router; 