const amqp = require('amqplib');
const config = require('./config');

async function startNotificationConsumer() {
  const connection = await amqp.connect(config.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(config.EXCHANGE_NAME, config.EXCHANGE_TYPE, { durable: true });
  const q = await channel.assertQueue(config.NOTIFICATION_QUEUE, { durable: true });
  await channel.bindQueue(q.queue, config.EXCHANGE_NAME, '');

  console.log(`[NotificationConsumer] Subscribed and waiting for OrderPlaced events...`);

  channel.consume(q.queue, (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());
    const { orderId, customerEmail } = event.payload;

    console.log(`[NotificationConsumer] Received ${event.eventType} (Event ID: ${event.eventId})`);
    console.log(`[NotificationConsumer] Sent order confirmation notification to ${customerEmail} for Order #${orderId}`);

    channel.ack(msg);
  });
}

startNotificationConsumer().catch((err) => {
  console.error('[NotificationConsumer] Error:', err.message);
});
