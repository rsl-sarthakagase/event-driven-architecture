# Order Notification System (Event-Driven Architecture)

A hands-on implementation of an Event-Driven Architecture (EDA) using Node.js and RabbitMQ. This project demonstrates the Publish/Subscribe (Pub/Sub) pattern, decoupled consumers, and idempotency handling in distributed message processing.

---

## Overview

The system simulates an e-commerce order placement workflow:
1. A producer publishes an `OrderPlaced` event to a RabbitMQ exchange.
2. RabbitMQ broadcasts the event to two independent consumer queues.
3. Notification Consumer receives the event and sends a confirmation email.
4. Analytics Consumer receives the event, updates sales metrics, and uses an event deduplication check to ensure idempotency.

---

## Architecture Flow

```
                      +-------------------+
                      |    src/producer   |
                      +---------+---------+
                                |
                   (OrderPlaced event payload)
                                v
                   +------------------------+
                   |    RabbitMQ Exchange   |
                   |     ('order_events')   |
                   |      [fanout type]     |
                   +-----------+------------+
                               |
             +-----------------+-----------------+
             |                                   |
             v                                   v
+--------------------------+        +--------------------------+
|       RabbitMQ Queue     |        |       RabbitMQ Queue     |
| ('notification_service') |        |   ('analytics_service')  |
+------------+-------------+        +------------+-------------+
             |                                   |
             v                                   v
+--------------------------+        +--------------------------+
|  notificationConsumer    |        |    analyticsConsumer     |
| (Simulates email alerts) |        | (Deduplication & metrics)|
+--------------------------+        +--------------------------+
```

---

## Event Schema

Each `OrderPlaced` event contains metadata (Event ID, Event Type, Timestamp) and the order payload:

```json
{
  "eventId": "aa588ac8-3223-4f9c-bb24-25651b44d429",
  "eventType": "OrderPlaced",
  "timestamp": "2026-10-13T10:08:27.201Z",
  "payload": {
    "orderId": "ORD-5537",
    "customerName": "Alice Smith",
    "customerEmail": "alice@example.com",
    "items": [
      {
        "name": "Wireless Keyboard",
        "price": 79.99,
        "quantity": 1
      },
      {
        "name": "Mouse",
        "price": 29.99,
        "quantity": 1
      }
    ],
    "totalAmount": 109.98,
    "currency": "USD"
  }
}
```

---

## Prerequisites

- Node.js (v16 or higher)
- Docker (for running RabbitMQ)

---

## Setup Instructions

### 1. Start RabbitMQ Broker
Run the RabbitMQ container using Docker Compose:
```bash
docker compose up -d
```
- AMQP Broker: `amqp://localhost:5672`
- Management Dashboard: `http://localhost:15672` (Username: `guest`, Password: `guest`)

### 2. Install Project Dependencies
```bash
npm install
```

---

## Running the Application

Open three separate terminal windows:

### Terminal 1: Notification Consumer
```bash
npm run consumer:notification
```
Listens for `OrderPlaced` events on `notification_service_queue` and logs email confirmation dispatch.

### Terminal 2: Analytics Consumer
```bash
npm run consumer:analytics
```
Listens on `analytics_service_queue`, checks for duplicate event IDs, and aggregates order count and revenue.

### Terminal 3: Producer
Publish a normal order:
```bash
npm run producer
```

Publish with duplicate simulation (tests Idempotency):
```bash
npm run producer:duplicate
```
This publishes the order, waits 1 second, and sends the exact same event ID again.

---

## Sample Output

### Producer Terminal
```text
[Producer] Publishing OrderPlaced event (Order: ORD-7057, Event ID: 569baccc-2608-42d3-90c4-6d46d4aaf337)
[Producer] Event published successfully.
[Producer] Publishing duplicate event with same Event ID (569baccc-2608-42d3-90c4-6d46d4aaf337)...
[Producer] Duplicate event published.
```

### Notification Consumer Terminal
```text
[NotificationConsumer] Subscribed and waiting for OrderPlaced events...
[NotificationConsumer] Received OrderPlaced (Event ID: 569baccc-2608-42d3-90c4-6d46d4aaf337)
[NotificationConsumer] Sent order confirmation notification to alice@example.com for Order #ORD-7057
```

### Analytics Consumer Terminal
```text
[AnalyticsConsumer] Subscribed and waiting for OrderPlaced events...
[AnalyticsConsumer] Received OrderPlaced (Event ID: 569baccc-2608-42d3-90c4-6d46d4aaf337)
[AnalyticsConsumer] Processed Order #ORD-7057 | Total Orders: 2 | Total Revenue: $219.96
[AnalyticsConsumer] Received OrderPlaced (Event ID: 569baccc-2608-42d3-90c4-6d46d4aaf337)
[AnalyticsConsumer][IDEMPOTENCY] Duplicate event detected (569baccc-2608-42d3-90c4-6d46d4aaf337). Skipping side effects.
```

---

## File Structure

- `docker-compose.yml`: RabbitMQ service configuration with management UI.
- `package.json`: Project dependencies and npm runner scripts.
- `src/config.js`: Shared RabbitMQ connection URL and queue/exchange configurations.
- `src/eventSchema.js`: Helper function to construct structured OrderPlaced events.
- `src/producer.js`: Publishes order events to RabbitMQ.
- `src/notificationConsumer.js`: Consumer handling customer confirmation alerts.
- `src/analyticsConsumer.js`: Consumer handling metrics aggregation and idempotency checks.
- `DOCUMENTATION.md`: Architectural write-up detailing the event flow and decoupling rationale.