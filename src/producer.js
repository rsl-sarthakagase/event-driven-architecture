const amqp = require('amqplib');
const config = require('./config');
const { createOrderPlacedEvent } = require('./eventSchema');

async function publishOrder() {
  const isDuplicate = process.argv.includes('--duplicate');

  const connection = await amqp.connect(config.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(config.EXCHANGE_NAME, config.EXCHANGE_TYPE, { durable: true });

  const event = createOrderPlacedEvent();
  const messageBuffer = Buffer.from(JSON.stringify(event));

  console.log(`[Producer] Publishing OrderPlaced event (Order: ${event.payload.orderId}, Event ID: ${event.eventId})`);
  channel.publish(config.EXCHANGE_NAME, '', messageBuffer, { persistent: true });
  console.log(`[Producer] Event published successfully.`);

  if (isDuplicate) {
    console.log(`[Producer] Publishing duplicate event with same Event ID (${event.eventId})...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    channel.publish(config.EXCHANGE_NAME, '', messageBuffer, { persistent: true });
    console.log(`[Producer] Duplicate event published.`);
  }

  await channel.close();
  await connection.close();
}

publishOrder().catch((err) => {
  console.error('[Producer] Error:', err.message);
});
