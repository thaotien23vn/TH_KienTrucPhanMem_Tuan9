const amqp = require('amqplib');
const inventoryService = require('./inventory');

let channel;

// Setup message queue connection and channels
async function setupMessageQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost:5672');
    channel = await connection.createChannel();
    
    // Setup queues
    await channel.assertQueue('order-created', { durable: true });
    await channel.assertQueue('payment-completed', { durable: true });
    await channel.assertQueue('order-cancelled', { durable: true });
    await channel.assertQueue('inventory-updated', { durable: true });
    await channel.assertQueue('low-stock-alert', { durable: true });
    
    // Consume messages from order-created queue to reserve inventory
    channel.consume('order-created', async (msg) => {
      if (msg !== null) {
        try {
          const order = JSON.parse(msg.content.toString());
          console.log('Received order created event:', order);
          
          // Reserve inventory for each order item
          for (const item of order.items) {
            await inventoryService.reserveInventory(item.productId, item.quantity);
          }
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing order created message:', error);
          // Reject the message and don't requeue if it's a validation error
          const requeue = !error.message.includes('Insufficient');
          channel.nack(msg, false, requeue);
        }
      }
    });
    
    // Consume messages from payment-completed queue to confirm inventory deduction
    channel.consume('payment-completed', async (msg) => {
      if (msg !== null) {
        try {
          const payment = JSON.parse(msg.content.toString());
          console.log('Received payment completed event:', payment);
          
          // Get the order details
          // In a real system, you'd fetch the order from the order service or a shared database
          // For this example, we'll assume we have the order ID and need to fetch it
          // This would be a call to the order service API
          const order = await fetchOrderDetails(payment.orderId);
          
          // Confirm inventory deduction for each order item
          for (const item of order.items) {
            const inventory = await inventoryService.confirmInventoryDeduction(
              item.productId,
              item.quantity
            );
            
            // Send low stock alert if needed
            if (inventory.isLowStock()) {
              await sendLowStockAlert(inventory);
            }
          }
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing payment completed message:', error);
          // Nack and requeue for retry
          channel.nack(msg, false, true);
        }
      }
    });
    
    // Consume messages from order-cancelled queue to release reserved inventory
    channel.consume('order-cancelled', async (msg) => {
      if (msg !== null) {
        try {
          const order = JSON.parse(msg.content.toString());
          console.log('Received order cancelled event:', order);
          
          // Release reserved inventory for each order item
          for (const item of order.items) {
            await inventoryService.releaseReservedInventory(item.productId, item.quantity);
          }
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing order cancelled message:', error);
          // Nack and requeue for retry
          channel.nack(msg, false, true);
        }
      }
    });
    
    return channel;
  } catch (error) {
    console.error('Error setting up message queue:', error);
    throw error;
  }
}

// Mock function to fetch order details (in a real system, this would call the order service)
async function fetchOrderDetails(orderId) {
  // This is a mock - in a real system you would call the order service API
  console.log(`Fetching order details for order ${orderId}`);
  
  // Return a mock order for testing
  return {
    _id: orderId,
    items: [
      { productId: 'product1', quantity: 2 },
      { productId: 'product2', quantity: 1 }
    ]
  };
}

// Send low stock alert
async function sendLowStockAlert(inventory) {
  if (!channel) {
    throw new Error('Channel not initialized');
  }
  
  return channel.sendToQueue(
    'low-stock-alert',
    Buffer.from(JSON.stringify({
      productId: inventory.productId,
      currentQuantity: inventory.quantity,
      availableQuantity: inventory.availableQuantity,
      threshold: inventory.lowStockThreshold,
      timestamp: new Date()
    })),
    { persistent: true }
  );
}

// Send inventory updated event
async function sendInventoryUpdatedEvent(inventory) {
  if (!channel) {
    throw new Error('Channel not initialized');
  }
  
  return channel.sendToQueue(
    'inventory-updated',
    Buffer.from(JSON.stringify({
      productId: inventory.productId,
      quantity: inventory.quantity,
      availableQuantity: inventory.availableQuantity,
      lastUpdated: inventory.lastUpdated
    })),
    { persistent: true }
  );
}

module.exports = {
  setupMessageQueue,
  sendLowStockAlert,
  sendInventoryUpdatedEvent
}; 