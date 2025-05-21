# Trendora Backend

## Overview
The Trendora Backend is a RESTful API built with Node.js and Express, designed to power the Trendora e-commerce platform. It handles user authentication, order management, product catalog, payment processing with Stripe, and email notifications. The backend integrates with a MongoDB database and is optimized to work with a Next.js frontend.

- **API Base URL**: `http://localhost:8000/api` (adjust as needed for production)

## Features
- User authentication (Customer and Staff roles)
- Order creation, retrieval, updating, and cancellation
- Payment processing with Stripe
- Product management (CRUD operations)
- Email notifications for order confirmations, updates, and admin alerts
- Refund request handling
- Stock management for products

## Prerequisites
- Node.js (v16.x or later)
- npm (v8.x or later)
- MongoDB (local or remote instance)
- Stripe account (for payment processing)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/damilolajohn6/qwik-trendora-backend.git
cd qwik-trendora-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add the following variables:
```
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_MAIL=your_smtp_email
SMTP_PASSWORD=your_smtp_password
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
FRONTEND_URL=http://localhost:3000
```

- Replace placeholders (e.g., `your_mongodb_connection_string`) with your actual values.
- Obtain Stripe keys from your Stripe dashboard.

### 4. Set Up MongoDB
- Ensure MongoDB is running locally or configure a remote connection string in `MONGO_URI`.
- Create the necessary collections (e.g., `orders`, `customers`, `products`) if not handled by Mongoose auto-creation.

### 5. Run the Application
```bash
npm start
```
The server will start on `http://localhost:8000`.

### 6. Run in Development Mode
For development with automatic restarts:
```bash
npm run dev
```

## API Endpoints

### Authentication
- **POST `/api/auth/login`**  
  Login for staff users.
  - Body: `{ email, password }`
  - Response: `{ token, user }`

- **POST `/api/auth/register`**  
  Register a new staff user.
  - Body: `{ username, email, password, phoneNumber, avatar }`
  - Response: `{ token, user }`

- **POST `/api/customers/login`**  
  Login for customers.
  - Body: `{ email, password }`
  - Response: `{ token, user }`

- **POST `/api/customers/register`**  
  Register a new customer.
  - Body: `{ fullname, email, password, phoneNumber, avatar }`
  - Response: `{ token, user }`

### Orders
- **POST `/api/orders`**  
  Create a new order.
  - Body: `{ items, paymentMethod, shippingAddress, paymentIntentId }`
  - Response: `{ success, data, clientSecret }`

- **GET `/api/orders`**  
  Retrieve all orders with pagination and filters.
  - Query: `?page=1&limit=10&status=pending&search=query`
  - Response: `{ success, data, pagination }`

- **GET `/api/orders/:id`**  
  Retrieve a single order.
  - Response: `{ success, data }`

- **PUT `/api/orders/:id`**  
  Update order status or payment.
  - Body: `{ status, paymentStatus, trackingNumber, refund }`
  - Response: `{ success, data }`

- **DELETE `/api/orders/:id`**  
  Cancel an order and initiate a refund.
  - Response: `{ success, message }`

- **POST `/api/orders/:id/process-payment`**  
  Process payment for an order.
  - Response: `{ success, data }`

### Products
- **PUT `/api/orders/stock/:productId`**  
  Manage stock for a product.
  - Body: `{ quantity }`
  - Response: `{ success, data }`

### Email Notifications
- Admin notifications are triggered automatically for new orders and refund requests.
- Customer emails are sent for order confirmations and updates.

## Dependencies
- `express`: Web framework
- `mongoose`: MongoDB object modeling
- `jsonwebtoken`: Authentication
- `stripe`: Payment processing
- `nodemailer`: Email notifications
- `dotenv`: Environment variables

## Development
- Use `npm run dev` to start the server with nodemon.
- Add new endpoints or models in the `routes` and `models` directories.
- Extend email templates in `utils/email.js`.

## Testing
- Use tools like Postman or cURL to test API endpoints.
- Example cURL for creating an order:
  ```bash
  curl -X POST http://localhost:8000/api/orders \
    -H "Authorization: Bearer your-customer-jwt-token" \
    -H "Content-Type: application/json" \
    -d '{
      "items": [{"product": "product-id", "name": "Smartphone", "price": 45000, "quantity": 1}],
      "paymentMethod": "Card",
      "shippingAddress": {
        "street": "123 Main St",
        "city": "Lagos",
        "state": "Lagos",
        "zipCode": "100001",
        "country": "Nigeria"
      },
      "paymentIntentId": "pi_123456789"
    }' \
    -v
  ```

## Deployment
- Deploy to a platform like Heroku, Render, or AWS.
- Update `MONGO_URI` and `FRONTEND_URL` for production.
- Set up environment variables on the hosting platform.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit changes (`git commit -m "Add feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a Pull Request.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact
- **Email**: damilolajohn622@gmail.com
- **Contact**: +2348138701686
- For support or inquiries, reach out via the provided contact details.

---

