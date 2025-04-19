const amqp = require('amqplib');

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queues = {
      customerCreated: 'customer.created',
      customerUpdated: 'customer.updated',
      customerDeleted: 'customer.deleted',
      orderCreated: 'order.created',
      orderUpdated: 'order.updated',
      orderCancelled: 'order.cancelled'
    };
  }

  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URI);
      this.channel = await this.connection.createChannel();
      
      // Assert queues
      await this.channel.assertQueue(this.queues.customerCreated, { durable: true });
      await this.channel.assertQueue(this.queues.customerUpdated, { durable: true });
      await this.channel.assertQueue(this.queues.customerDeleted, { durable: true });
      
      // Assert queues for order events
      await this.channel.assertQueue(this.queues.orderCreated, { durable: true });
      await this.channel.assertQueue(this.queues.orderUpdated, { durable: true });
      await this.channel.assertQueue(this.queues.orderCancelled, { durable: true });

      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('RabbitMQ connection error:', error);
      throw error;
    }
  }

  async publish(queue, message) {
    try {
      if (!this.channel) {
        await this.connect();
      }
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  async consume(queue, callback) {
    try {
      if (!this.channel) {
        await this.connect();
      }
      await this.channel.consume(queue, (message) => {
        if (message) {
          const content = JSON.parse(message.content.toString());
          callback(content);
          this.channel.ack(message);
        }
      });
    } catch (error) {
      console.error('Error consuming message:', error);
      throw error;
    }
  }
}

module.exports = new RabbitMQService(); 