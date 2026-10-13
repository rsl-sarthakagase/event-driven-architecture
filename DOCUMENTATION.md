# Architectural Write-Up: Order Notification System

This document outlines the architectural design of the Order Notification System built with Node.js and RabbitMQ, covering the end-to-end event flow, decoupling benefits over traditional request/response models, and the implementation of idempotency.

---

## 1. End-to-End Event Flow

The system implements the Publish/Subscribe (Pub/Sub) pattern where an order event is published once and delivered to multiple independent services.

### Flow Diagram

```
[Producer: producer.js]
          |
          | 1. Publishes OrderPlaced event
          v
[RabbitMQ Exchange: 'order_events' (fanout)]
          |
          +-------------------------------+
          |                               |
          | 2a. Routes copy               | 2b. Routes copy
          v                               v
[Queue: 'notification_service_queue']   [Queue: 'analytics_service_queue']
          |                               |
          | 3a. Consumes                  | 3b. Consumes
          v                               v
[Notification Consumer]                 [Analytics Consumer]
 - Sends email confirmation              - Checks if event was processed
 - Acknowledges message (ack)            - Updates total orders & revenue
                                         - Acknowledges message (ack)
```

### Flow Breakdown

1. **Event Production:**
   - When an order occurs, `src/producer.js` creates a structured `OrderPlaced` event.
   - The event contains metadata (`eventId`, `eventType`, `timestamp`) and domain data (`orderId`, customer email, items, total amount).
   - The producer connects to the RabbitMQ broker via AMQP, asserts a fanout exchange named `order_events`, and publishes the message.

2. **Broker Distribution:**
   - RabbitMQ receives the message at the `order_events` exchange.
   - Since the exchange type is `fanout`, it duplicates and places a copy of the event into every queue bound to it.
   - The two consumer queues (`notification_service_queue` and `analytics_service_queue`) each receive their own copy.
   - If a consumer is temporarily offline, RabbitMQ safely holds messages in its queue until the consumer reconnects.

3. **Consumer Reactions:**
   - **Notification Consumer (`src/notificationConsumer.js`)**: Reads from its queue and logs an email confirmation to the customer. Once finished, it acknowledges the message so RabbitMQ removes it from that queue.
   - **Analytics Consumer (`src/analyticsConsumer.js`)**: Reads from its queue and checks whether the `eventId` has already been seen. If new, it increments order counts and sales revenue. If duplicate, it skips the update to avoid double-counting. It then acknowledges the message.

---

## 2. Decoupling Rationale: EDA vs. Direct Request/Response

In a traditional synchronous request/response model (such as REST or gRPC), the Order service would call the Notification service and Analytics service directly over HTTP. 

Using an Event-Driven Architecture with RabbitMQ decouples the system in the following ways:

### Comparison

| Aspect | Synchronous Request/Response | Event-Driven Architecture (RabbitMQ) |
|---|---|---|
| **Time (Temporal)** | The producer must wait for every downstream service to finish before responding to the client. If notification service is slow or down, the order call fails. | The producer publishes the event and finishes immediately (~2ms). Consumers process messages at their own pace. |
| **Location (Spatial)** | The producer needs to know downstream URLs, IP addresses, ports, and route endpoints. | The producer only knows the broker exchange. It has no knowledge of how many consumers exist or where they run. |
| **Adding New Features** | Adding a new service (like an Inventory or Fraud check service) requires modifying and redeploying the Order service. | New services can be added anytime by creating a new queue and binding it to the exchange. The producer does not change at all. |
| **Failure Handling** | If a downstream service crashes, the order checkout may fail or require complex retry logic in the caller. | If a consumer crashes, messages stay safely queued in RabbitMQ and are processed when the consumer recovers. |
| **Performance** | Total latency is the sum of all downstream calls: `T = T_order + T_notify + T_analytics`. | Latency for the producer is only the publish time to the local message broker. |

---

## 3. Idempotency Handling

### Why Idempotency Matters
Message brokers typically provide **at-least-once delivery**. In real-world environments, network timeouts, consumer crashes, or broker redeliveries can cause a consumer to receive the exact same message more than once.

Without idempotency handling, duplicate messages lead to corrupt state, such as sending customers multiple emails or double-counting order revenue in business reports.

### How It Is Implemented
In `src/analyticsConsumer.js`, idempotency is achieved by tracking processed event identifiers:

1. Each incoming event has a unique `eventId` generated at creation time.
2. The consumer keeps a record of processed IDs in a `processedEvents` Set.
3. When a message arrives:
   - If the ID is already present, the consumer logs that a duplicate was detected, skips modifying the revenue or order count, and acknowledges the message so it is cleared from the queue.
   - If the ID is new, it records the ID, updates the analytics metrics, and acknowledges the message.

This ensures that processing a message multiple times produces the exact same outcome as processing it once.

---

## 4. Conclusion

Using RabbitMQ with a fanout exchange allows the order processing system to remain simple, fast, and loosely coupled. Producers and consumers can be updated, scaled, or restarted independently without breaking the system.
