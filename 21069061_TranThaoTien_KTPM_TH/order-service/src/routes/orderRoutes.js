const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const rabbitmqService = require('../services/rabbitmqService');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customerId')
      .populate('items.productId');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId')
      .populate('items.productId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new order
router.post('/', async (req, res) => {
  const order = new Order({
    customerId: req.body.customerId,
    items: req.body.items,
    totalAmount: req.body.totalAmount,
    shippingAddress: req.body.shippingAddress,
    paymentMethod: req.body.paymentMethod
  });

  try {
    const newOrder = await order.save();
    // Publish order created event
    await rabbitmqService.publish(rabbitmqService.queues.orderCreated, newOrder);
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = req.body.status;
    const updatedOrder = await order.save();
    
    // Publish order updated event
    await rabbitmqService.publish(rabbitmqService.queues.orderUpdated, updatedOrder);
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cancel order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = 'cancelled';
    const cancelledOrder = await order.save();
    
    // Publish order cancelled event
    await rabbitmqService.publish(rabbitmqService.queues.orderCancelled, cancelledOrder);
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 