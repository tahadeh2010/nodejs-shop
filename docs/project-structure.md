# Project Structure

This document describes the directory layout and the responsibility of each folder in the NodeJS Shop application.

## Root Directory

| File | Purpose |
|------|---------|
| `app.js` | Application entry point. Configures Express, middleware, routes, MongoDB connection, and starts the server. |
| `package.json` | Project metadata, dependencies, and npm scripts. |
| `.env` | Environment variables (not committed to git). |
| `.env.example` | Template for environment configuration. |
| `.gitignore` | Git ignore rules. |

## controllers/

Request handlers that bridge routes to business logic. Each controller file corresponds to a domain area.

| File | Responsibility |
|------|---------------|
| `admin.js` | Product CRUD operations for administrators — add, edit, delete products. Validates input via express-validator and handles image upload. |
| `auth.js` | Authentication logic — login, signup, logout, password reset, password reset token generation and validation. |
| `shop.js` | Core shop functionality — product listing, product details, shopping cart management, order creation, payment processing (Zarinpal), invoice PDF generation. |
| `error.js` | Renders the 500 server error page. |

## models/

Mongoose schemas that define the MongoDB data structure.

| File | Purpose |
|------|---------|
| `user.js` | User schema with email, password, reset token fields, embedded cart with items array, and instance methods (`addTocart`, `removeFromCart`, `clearCart`). |
| `product.js` | Product schema with title, price, description, imageUrl, and userId reference to the owning user. |
| `order.js` | Order schema with an embedded products array (product snapshot + quantity) and user reference. |

## routes/

Express Router definitions that map URLs to controllers.

| File | Mount Point | Routes |
|------|-------------|--------|
| `admin.js` | `/admin` | GET/POST add-product, GET products, GET/POST edit-product, DELETE product |
| `auth.js` | `/` | GET/POST login, POST logout, GET/POST signup, GET/POST reset, GET reset/:token, POST new-password |
| `shop.js` | `/` | GET index, GET products, GET product details, GET/POST cart, POST cart-delete-item, GET checkout, GET payment, GET checkPayment, POST create-order, GET orders, GET invoices/:orderId |

## middleware/

Custom Express middleware functions.

| File | Purpose |
|------|---------|
| `is-auth.js` | Authentication guard. Checks `req.session.isLoggedIn` and redirects to `/login` if not authenticated. Applied to protected routes. |

## util/

Utility modules for cross-cutting concerns.

| File | Purpose |
|------|---------|
| `email.js` | Email sending utility using Nodemailer with Mailtrap SMTP configuration. Used for signup confirmation and password reset emails. |
| `file.js` | File system helper that wraps `fs.unlink` for safe file deletion (used when removing product images). |
| `cookieparser.js` | Manual cookie parser that parses the `Cookie` header into a key-value object. Currently not used in the main application flow (session management uses `express-session`). |

## views/

EJS (Embedded JavaScript) templates organized by domain.

### views/admin/
| File | Purpose |
|------|---------|
| `add-product.ejs` | Form for adding a new product. Reused for editing with `editing` flag. |
| `products.ejs` | Lists all admin-owned products with edit and delete controls. |

### views/auth/
| File | Purpose |
|------|---------|
| `login.ejs` | Login form with email/password fields and flash message display. |
| `singup.ejs` | Signup form with email, password, and confirm password fields. Note: filename uses "singup" (typo). |
| `reset.ejs` | Password reset request form (enter email). |
| `new-password.ejs` | New password form after clicking reset link. |

### views/shop/
| File | Purpose |
|------|---------|
| `index.ejs` | Homepage with paginated product grid. |
| `product-list.ejs` | Full product listing with pagination. |
| `product-details.ejs` | Single product detail view with add-to-cart form. |
| `cart.ejs` | Shopping cart view with item list, quantities, and delete buttons. |
| `checkout.ejs` | Checkout page showing cart summary and total price. |
| `orders.ejs` | Order history list with invoice download links. |

### views/includes/
| File | Purpose |
|------|---------|
| `head.ejs` | HTML head section with CSS links and Tailwind CDN. |
| `heading.ejs` | Page heading/banner area. |
| `navigation.ejs` | Top navigation bar — conditional links based on authentication state. Uses Tailwind CSS. |
| `layout.ejs` | Base layout wrapper (head + heading + navigation + content + end). |
| `end.ejs` | Closing HTML tags and script includes. |
| `pagination.ejs` | Reusable pagination component. |
| `add-to-cart.ejs` | Reusable add-to-cart form snippet. |

### Root views/
| File | Purpose |
|------|---------|
| `404.ejs` | Not found error page. |
| `500.ejs` | Server error page. |

## public/

Static assets served directly by Express.

### public/css/
| File | Purpose |
|------|---------|
| `main.css` | Main application styles. |
| `product.css` | Product-specific styles. |
| `cart.css` | Cart page styles. |
| `forms.css` | Form styling. |
| `hero.css` | Hero section styles. |
| `order.css` | Order page styles. |

### public/js/
| File | Purpose |
|------|---------|
| `main.js` | Mobile navigation drawer toggle logic. |
| `admin.js` | Client-side product deletion via `fetch()` API with CSRF token header. |

### public/images/
Static images used in the frontend (e.g., hero images).

## images/

Directory for **uploaded product images**. Files are stored with a timestamp prefix (e.g., `Mon Jun 08 2026_...png`). Managed by Multer with disk storage configuration.

## files/

Directory for **generated files**.

### files/invoices/
PDF invoices generated by PDFKit when users download order invoices. Files are named `invoices-{orderId}.pdf`.

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables — database connection, session secret, API keys. |
| `.env.example` | Template for required environment variables. |
| `.gitignore` | Excludes `node_modules/`, `.env`, and uploaded images from version control. |
| `package.json` | Dependencies, scripts (`dev` with nodemon, `test` placeholder). |
