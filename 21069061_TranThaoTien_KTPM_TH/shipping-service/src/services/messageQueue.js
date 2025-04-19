const amqp = require('amqplib');
const shippingService = require('./shipping');

let channel;

// Setup message queue connection and channels
async function setupMessageQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost:5672');
    channel = await connection.createChannel();
    
    // Setup queues
    await channel.assertQueue('payment-completed', { durable: true });
    await channel.assertQueue('order-cancelled', { durable: true });
    await channel.assertQueue('shipping-updated', { durable: true });
    await channel.assertQueue('shipping-status', { durable: true });
    
    // Consume messages from payment-completed queue
    channel.consume('payment-completed', async (msg) => {
      if (msg !== null) {
        try {
          const payment = JSON.parse(msg.content.toString());
          console.log('Received payment completed event:', payment);
          
          // Process shipping for the order
          const shipping = await shippingService.processShipping(payment.orderId);
          
          // Send shipping updated message
          await sendShippingUpdatedMessage(shipping);
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing payment completed message:', error);
          // Nack and requeue for retry
          channel.nack(msg, false, true);
        }
      }
    });
    
    // Consume messages from order-cancelled queue
    channel.consume('order-cancelled', async (msg) => {
      if (msg !== null) {
        try {
          const order = JSON.parse(msg.content.toString());
          console.log('Received order cancelled event:', order);
          
          // Get shipping record
          const shipping = await shippingService.getShippingByOrderId(order.orderId);
          
          if (shipping) {
            // Cancel shipping
            const cancelledShipping = await shippingService.cancelShipping(
              shipping._id,
              'Order was cancelled'
            );
            
            // Send shipping updated message
            await sendShippingUpdatedMessage(cancelledShipping);
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

// Send shipping updated message
async function sendShippingUpdatedMessage(shipping) {
  if (!channel) {
    throw new Error('Channel not initialized');
  }
  
  return channel.sendToQueue(
    'shipping-updated',
    Buffer.from(JSON.stringify({
      orderId: shipping.orderId,
      shippingId: shipping._id,
      status: shipping.status,
      trackingNumber: shipping.trackingNumber,
      carrier: shipping.carrier,
      estimatedDelivery: shipping.estimatedDelivery,
      lastUpdate: shipping.history[shipping.history.length - 1]
    })),
    { persistent: true }
  );
}

// Send shipping status message
async function sendShippingStatusMessage(shipping) {
  if (!channel) {
    throw new Error('Channel not initialized');
  }
  
  return channel.sendToQueue(
    'shipping-status',
    Buffer.from(JSON.stringify({
      orderId: shipping.orderId,
      shippingId: shipping._id,
      status: shipping.status,
      trackingNumber: shipping.trackingNumber,
      carrier: shipping.carrier,
      lastUpdate: shipping.history[shipping.history.length - 1]
    })),
    { persistent: true }
  );
}

module.exports = {
  setupMessageQueue,
  sendShippingUpdatedMessage,
  sendShippingStatusMessage
}; 