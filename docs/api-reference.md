# API Reference

Complete route reference for the NodeJS Shop application.

## Authentication Routes

| Method | URL | Purpose | Middleware | Controller | Auth Required |
|--------|-----|---------|------------|------------|---------------|
| GET | `/login` | Render login form | — | `auth.getLogin` | No |
| POST | `/login` | Process login | express-validator | `auth.postLogin` | No |
| POST | `/logout` | Destroy session | — | `auth.postLogout` | No |
| GET | `/signup` | Render signup form | — | `auth.getSignup` | No |
| POST | `/signup` | Process registration | express-validator | `auth.postSignup` | No |
| GET | `/reset` | Render password reset form | — | `auth.getReset` | No |
| POST | `/reset` | Send reset email | — | `auth.postReset` | No |
| GET | `/reset/:token` | Render new password form | — | `auth.getResetPassword` | No |
| POST | `/new-password` | Set new password | — | `auth.postNewPassword` | No |

### Validation Rules

**POST /signup:**

| Field | Rule | Error Message |
|-------|------|---------------|
| `email` | Valid email, normalized | "Please enter a valid email" |
| `email` | Custom: not `test@gmail.com` | "You are not allowed" |
| `password` | min 5, alphanumeric | "Password must be 5+ alphanumeric characters" |
| `confimPassword` | Must match `password` | "Passwords do not match" |

**POST /login:**

| Field | Rule | Error Message |
|-------|------|---------------|
| `email` | Valid email, normalized | "Please enter a valid email" |
| `password` | 5-25 chars, alphanumeric | "Please enter a valid password" |

## Shop Routes

| Method | URL | Purpose | Middleware | Controller | Auth Required |
|--------|-----|---------|------------|------------|---------------|
| GET | `/` | Homepage with paginated products | — | `shop.getIndex` | No |
| GET | `/products` | Product listing with pagination | — | `shop.getProducts` | No |
| GET | `/products/:productId` | Single product details | — | `shop.getProduct` | No |
| GET | `/cart` | View shopping cart | — | `shop.getCart` | No |
| POST | `/cart` | Add product to cart | — | `shop.postCart` | No |
| POST | `/cart-delete-item` | Remove item from cart | — | `shop.postCartDeleteProduct` | No |
| GET | `/checkout` | Checkout page | `is-auth` | `shop.getCheckout` | Yes |
| GET | `/PaymentRequest` | Initiate Zarinpal payment | `is-auth` | `shop.getPayment` | Yes |
| GET | `/checkPayment` | Payment verification callback | `is-auth` | `shop.checkPayment` | Yes |
| POST | `/create-order` | Create order from cart | — | `shop.postOrder` | No |
| GET | `/orders` | View order history | — | `shop.getOrder` | No |
| GET | `/invoices/:orderId` | Download PDF invoice | `is-auth` | `shop.getInvoices` | Yes |

### Pagination Parameters

**GET /** and **GET /products** accept:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Integer | 1 | Page number |

**Items per page**: 6 (hardcoded as `ITEMS_PER_PAGE` in `shop.js`)

**Response data includes:**

| Variable | Type | Description |
|----------|------|-------------|
| `currentPage` | Number | Current page number |
| `totalProducts` | Number | Total product count |
| `hasNextPage` | Boolean | Whether next page exists |
| `hasPreviousPage` | Boolean | Whether previous page exists |
| `nextPage` | Number | Next page number |
| `previousPage` | Number | Previous page number |
| `lastPage` | Number | Total number of pages |

## Admin Routes

All admin routes are mounted under `/admin` prefix and require authentication.

| Method | URL | Purpose | Middleware | Controller | Auth Required |
|--------|-----|---------|------------|------------|---------------|
| GET | `/admin/add-product` | Render add product form | `is-auth` | `admin.getAddProduct` | Yes |
| POST | `/admin/add-product` | Create new product | express-validator, `is-auth` | `admin.postAddProduct` | Yes |
| GET | `/admin/products` | List admin's products | `is-auth` | `admin.getProducts` | Yes |
| GET | `/admin/edit-product/:productId` | Render edit product form | `is-auth` | `admin.getEditProduct` | Yes |
| POST | `/admin/edit-product` | Update product | express-validator, `is-auth` | `admin.postEditProduct` | Yes |
| DELETE | `/admin/product/:productId` | Delete product | `is-auth` | `admin.deleteProduct` | Yes |

### Validation Rules

**POST /admin/add-product** and **POST /admin/edit-product:**

| Field | Rule | Error Message |
|-------|------|---------------|
| `title` | String, min 3 chars, trimmed | "Please enter a valid name" |
| `price` | Float | "Please enter a valid price" |
| `description` | 5-500 chars, trimmed | "Please enter valid description" |

### Delete Product Response

Returns JSON:
```json
{ "message": "Successfull" }
```

On error:
```json
{ "message": "Delete product faild" }
```

## Error Routes

| Method | URL | Purpose | Controller |
|--------|-----|---------|------------|
| GET | `*` (catch-all) | 404 Not Found | (built-in) |
| GET | `/500` | Server Error | `error.get500` |

## Middleware Summary

| Middleware | Applied To | Purpose |
|------------|------------|---------|
| `is-auth` | Admin routes, checkout, payment, invoices | Checks `req.session.isLoggedIn` |
| `express-validator` | Auth and admin POST routes | Input validation |
| `multer` | Global (file upload) | Multipart form handling |
| `csurf` | Global | CSRF token validation |
| `connect-flash` | Global | Flash messages |
| `express-session` | Global | Session management |

## Request/Response Formats

### Form Submissions

All forms use `application/x-www-form-urlencoded` encoding with a CSRF token field:

```html
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

### File Uploads

Product image forms use `multipart/form-data`:

```html
<form action="/admin/add-product" method="POST" enctype="multipart/form-data">
    <input type="file" name="image">
</form>
```

### AJAX Delete

Product deletion uses `fetch()` with CSRF token header:

```javascript
fetch(`/admin/product/${prodId}`, {
    method: 'DELETE',
    headers: { 'csrf-token': csrf }
});
```

### JSON Responses

Delete product returns JSON:
```json
{ "message": "Successfull" }
```

All other routes return HTML (server-rendered EJS templates).
