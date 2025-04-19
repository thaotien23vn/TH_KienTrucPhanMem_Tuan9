const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventory');
const { sendInventoryUpdatedEvent } = require('../services/messageQueue');

// Create a new inventory record
router.post('/', async (req, res) => {
  try {
    const inventory = await inventoryService.createInventory(req.body);
    await sendInventoryUpdatedEvent(inventory);
    res.status(201).json(inventory);
  } catch (error) {
    console.error('Error creating inventory record:', error);
    res.status(500).json({ message: 'Failed to create inventory record', error: error.message });
  }
});

// Get inventory by product ID
router.get('/product/:productId', async (req, res) => {
  try {
    const inventory = await inventoryService.getInventoryByProductId(req.params.productId);
    
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }
    
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Failed to fetch inventory', error: error.message });
  }
});

// Update inventory (add or remove stock)
router.put('/product/:productId', async (req, res) => {
  try {
    const { quantity, operation } = req.body;
    
    if (!quantity || !operation) {
      return res.status(400).json({ message: 'Quantity and operation are required' });
    }
    
    if (!['increment', 'decrement'].includes(operation)) {
      return res.status(400).json({ message: 'Operation must be either increment or decrement' });
    }
    
    const inventory = await inventoryService.updateInventory(
      req.params.productId,
      quantity,
      operation
    );
    
    await sendInventoryUpdatedEvent(inventory);
    res.json(inventory);
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ message: 'Failed to update inventory', error: error.message });
  }
});

// Reserve inventory for an order
router.post('/reserve', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }
    
    const inventory = await inventoryService.reserveInventory(productId, quantity);
    res.json(inventory);
  } catch (error) {
    console.error('Error reserving inventory:', error);
    
    if (error.message.includes('Insufficient')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to reserve inventory', error: error.message });
  }
});

// Release reserved inventory
router.post('/release', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }
    
    const inventory = await inventoryService.releaseReservedInventory(productId, quantity);
    res.json(inventory);
  } catch (error) {
    console.error('Error releasing inventory:', error);
    res.status(500).json({ message: 'Failed to release inventory', error: error.message });
  }
});

// Get all low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const lowStockItems = await inventoryService.getLowStockItems();
    res.json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ message: 'Failed to fetch low stock items', error: error.message });
  }
});

module.exports = router; 