const amqp = require('amqplib');
const config = require('./config');

const processedEvents = new Set();
let totalOrders = 0;
let totalRevenue = 0;

async function startAnalyticsConsumer() {
  const connection = await amqp.connect(config.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(config.EXCHANGE_NAME, config.EXCHANGE_TYPE, { durable: true });
  const q = await channel.assertQueue(config.ANALYTICS_QUEUE, { durable: true });
  await channel.bindQueue(q.queue, config.EXCHANGE_NAME, '');

  console.log(`[AnalyticsConsumer] Subscribed and waiting for OrderPlaced events...`);

  channel.consume(q.queue, (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());
    const { eventId, payload } = event;

    console.log(`[AnalyticsConsumer] Received ${event.eventType} (Event ID: ${eventId})`);

    // Idempotency check: prevent duplicate side effects
    if (processedEvents.has(eventId)) {
      console.log(`[AnalyticsConsumer][IDEMPOTENCY] Duplicate event detected (${eventId}). Skipping side effects.`);
      channel.ack(msg);
      return;
    }

    processedEvents.add(eventId);
    totalOrders += 1;
    totalRevenue += payload.totalAmount || 0;

    console.log(`[AnalyticsConsumer] Processed Order #${payload.orderId} | Total Orders: ${totalOrders} | Total Revenue: $${totalRevenue.toFixed(2)}`);

    channel.ack(msg);
  });
}

startAnalyticsConsumer().catch((err) => {
  console.error('[AnalyticsConsumer] Error:', err.message);
});
