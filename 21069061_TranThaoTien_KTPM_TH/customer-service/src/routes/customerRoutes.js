const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const rabbitmqService = require('../services/rabbitmqService');

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().select('-password');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select('-password');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new customer
router.post('/', async (req, res) => {
  const customer = new Customer({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    addresses: req.body.addresses
  });

  try {
    const newCustomer = await customer.save();
    // Remove password from response
    const customerResponse = newCustomer.toObject();
    delete customerResponse.password;
    
    // Publish customer created event
    await rabbitmqService.publish(rabbitmqService.queues.customerCreated, customerResponse);
    res.status(201).json(customerResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    customer.firstName = req.body.firstName || customer.firstName;
    customer.lastName = req.body.lastName || customer.lastName;
    customer.email = req.body.email || customer.email;
    customer.phone = req.body.phone || customer.phone;
    customer.addresses = req.body.addresses || customer.addresses;

    if (req.body.password) {
      customer.password = req.body.password;
    }

    const updatedCustomer = await customer.save();
    // Remove password from response
    const customerResponse = updatedCustomer.toObject();
    delete customerResponse.password;
    
    // Publish customer updated event
    await rabbitmqService.publish(rabbitmqService.queues.customerUpdated, customerResponse);
    res.json(customerResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.remove();
    // Publish customer deleted event
    await rabbitmqService.publish(rabbitmqService.queues.customerDeleted, { id: req.params.id });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 