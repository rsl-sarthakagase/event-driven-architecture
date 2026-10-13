/**
 * RabbitMQ Configuration & Constants
 */
module.exports = {
  // AMQP connection URL (defaults to standard local RabbitMQ port 5672)
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',

  // Exchange Name: uses fanout pattern to broadcast events to all bound queues
  EXCHANGE_NAME: 'order_events',
  EXCHANGE_TYPE: 'fanout',

  // Dedicated Queues for independent consumers
  NOTIFICATION_QUEUE: 'notification_service_queue',
  ANALYTICS_QUEUE: 'analytics_service_queue',

  // Routing key (empty for fanout exchange, but defined for consistency)
  ROUTING_KEY: ''
};
