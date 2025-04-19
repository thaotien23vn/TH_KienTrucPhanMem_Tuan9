# E-commerce Microservices System

This project implements a microservices-based e-commerce system with the following services:

## Services
- Product Service: Manages product information (name, price, description, inventory, etc.)
- Order Service: Handles order management (create, view, cancel orders, etc.)
- Customer Service: Manages customer information (name, address, contact details, etc.)
- Payment Service: Processes payments and manages payment statuses
- Inventory Service: Manages product inventory and stock levels
- Shipping Service: Handles shipping and delivery status tracking
- API Gateway: Single entry point for client requests, with fault tolerance features

## Technology Stack
- Node.js with Express
- MongoDB for database
- RabbitMQ for message broker
- Docker and Docker Compose for containerization
- REST API for inter-service communication
- Circuit Breaker, Retry, Rate Limiter, and Time Limiter for fault tolerance

## Architecture
```
Client -> API Gateway -> Microservices
                      -> Product Service (MongoDB)
                      -> Order Service (MongoDB)
                      -> Customer Service (MongoDB)
                      -> Payment Service (MongoDB)
                      -> Inventory Service (MongoDB)
                      -> Shipping Service (MongoDB)
```

## Fault Tolerance Features
- Circuit Breaker: Prevents cascading failures by failing fast when a service is unavailable
- Retry Mechanism: Automatically retries failed operations with exponential backoff
- Rate Limiter: Protects services from being overwhelmed by too many requests
- Time Limiter: Ensures requests don't hang indefinitely by setting timeouts

## Service Communication
Services communicate with each other through:
1. Synchronous REST API calls (via API Gateway)
2. Asynchronous messaging via RabbitMQ message broker

## Getting Started
1. Clone the repository
2. Run `docker-compose up` to start all services
3. Access the API Gateway at http://localhost:3000

## API Documentation
- Product Service: http://localhost:3001/api/products
- Order Service: http://localhost:3002/api/orders
- Customer Service: http://localhost:3003/api/customers
- Payment Service: http://localhost:3004/api/payments
- Inventory Service: http://localhost:3005/api/inventory
- Shipping Service: http://localhost:3006/api/shipping

## Common Workflow
1. Customer browses products (Product Service)
2. Customer adds products to cart and places order (Order Service)
3. Payment is processed (Payment Service)
4. Inventory is checked and updated (Inventory Service)
5. Order is shipped (Shipping Service)
6. Shipping status is tracked until delivery (Shipping Service) 