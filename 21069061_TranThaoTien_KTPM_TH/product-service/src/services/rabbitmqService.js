const amqp = require('amqplib');

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queues = {
      productCreated: 'product.created',
      productUpdated: 'product.updated',
      productDeleted: 'product.deleted'
    };
  }

  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URI);
      this.channel = await this.connection.createChannel();
      
      // Assert queues
      await this.channel.assertQueue(this.queues.productCreated, { durable: true });
      await this.channel.assertQueue(this.queues.productUpdated, { durable: true });
      await this.channel.assertQueue(this.queues.productDeleted, { durable: true });

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