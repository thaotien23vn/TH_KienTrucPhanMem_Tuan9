const amqp = require('amqplib');
const paymentService = require('./payment');

let channel;

// Setup message queue connection and channels
async function setupMessageQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost:5672');
    channel = await connection.createChannel();
    
    // Setup queues
    await channel.assertQueue('order-payment', { durable: true });
    await channel.assertQueue('payment-completed', { durable: true });
    await channel.assertQueue('payment-failed', { durable: true });
    await channel.assertQueue('payment-refunded', { durable: true });
    
    // Consume messages from order-payment queue
    channel.consume('order-payment', async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log('Received order payment request:', content);
          
          // Create payment record
          const payment = await paymentService.createPayment({
            orderId: content.orderId,
            customerId: content.customerId,
            amount: content.amount,
            paymentMethod: content.paymentMethod
          });
          
          // Process the payment
          const processedPayment = await paymentService.processPayment(payment._id);
          
          // Send result to appropriate queue
          if (processedPayment.status === 'completed') {
            channel.sendToQueue(
              'payment-completed',
              Buffer.from(JSON.stringify({
                orderId: processedPayment.orderId,
                paymentId: processedPayment._id,
                status: processedPayment.status,
                transactionId: processedPayment.transactionId
              })),
              { persistent: true }
            );
          } else {
            channel.sendToQueue(
              'payment-failed',
              Buffer.from(JSON.stringify({
                orderId: processedPayment.orderId,
                paymentId: processedPayment._id,
                status: processedPayment.status,
                error: processedPayment.metadata.error
              })),
              { persistent: true }
            );
          }
          
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing payment message:', error);
          // Reject the message and requeue it
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

// Send payment completed message
async function sendPaymentCompletedMessage(payment) {
  if (!channel) {
    throw new Error('Channel not initialized');
  }
  
  return channel.sendToQueue(
    'payment-completed',
    Buffer.from(JSON.stringify({
      orderId: payment.orderId,
      paymentId: payment._id,
      status: payment.status,
      transactionId: payment.transactionId
    })),
    { persistent: true }
  );
}

// Send payment failed message
async function sendPaymentFailedMessage(payment, error) {
  if (!channel) {
    throw new Error('Channel not initialized');
  }
  
  return channel.sendToQueue(
    'payment-failed',
    Buffer.from(JSON.stringify({
      orderId: payment.orderId,
      paymentId: payment._id,
      status: payment.status,
      error: error.message || 'Unknown error'
    })),
    { persistent: true }
  );
}

// Send payment refunded message
async function sendPaymentRefundedMessage(payment) {
  if (!channel) {
    throw new Error('Channel not initialized');
  }
  
  return channel.sendToQueue(
    'payment-refunded',
    Buffer.from(JSON.stringify({
      orderId: payment.orderId,
      paymentId: payment._id,
      status: payment.status,
      refundReason: payment.metadata.refundReason
    })),
    { persistent: true }
  );
}

module.exports = {
  setupMessageQueue,
  sendPaymentCompletedMessage,
  sendPaymentFailedMessage,
  sendPaymentRefundedMessage
}; 