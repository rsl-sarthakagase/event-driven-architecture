const crypto = require('crypto');

/**
 * Creates an OrderPlaced event adhering to the required schema:
 * - Event ID, Event Type, Timestamp, and Payload
 */
function createOrderPlacedEvent() {
  return {
    eventId: crypto.randomUUID(),
    eventType: 'OrderPlaced',
    timestamp: new Date().toISOString(),
    payload: {
      orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: 'Alice Smith',
      customerEmail: 'alice@example.com',
      items: [
        { name: 'Wireless Keyboard', price: 79.99, quantity: 1 },
        { name: 'Mouse', price: 29.99, quantity: 1 }
      ],
      totalAmount: 109.98,
      currency: 'USD'
    }
  };
}

module.exports = { createOrderPlacedEvent };
