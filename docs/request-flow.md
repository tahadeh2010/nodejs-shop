# Request Flow

This document describes the step-by-step request flow for each major user action in the application.

## User Registration

**Route**: `POST /signup`  
**Controller**: `auth.js` → `postSignup`  
**Validation**: `routes/auth.js` (express-validator)

```mermaid
sequenceDiagram
    participant U as User
    participant V as Validator
    participant C as Controller
    participant DB as MongoDB
    participant E as Email

    U->>V: POST /signup (email, password, confirmPassword)
    
    V->>V: Validate email (valid, normalized)
    V->>V: Validate password (min 5, alphanumeric)
    V->>V: Validate confirmPassword matches password
    
    alt Validation fails
        V-->>U: 422 - Re-render signup form with errors
    else Validation passes
        V->>C: Call postSignup()
        C->>DB: User.findOne({ email })
        alt Email already exists
            C-->>U: Flash error, redirect /signup
        else Email available
            C->>C: bcrypt.hash(password, 12)
            C->>DB: new User({...}).save()
            DB-->>C: User created
            C->>E: Send signup confirmation email
            C-->>U: Flash success, redirect /login
        end
    end
```

### Steps

1. User submits signup form with email, password, and confirm password
2. `express-validator` validates email format, password length/characters, and password match
3. If validation fails, form re-renders with error messages
4. Controller checks if email already exists in database
5. If email exists, flash error and redirect to signup
6. Password is hashed with bcrypt (12 rounds)
7. New user document is created with empty cart
8. Confirmation email is sent via Nodemailer
9. User is redirected to login page with success flash message

## User Login

**Route**: `POST /login`  
**Controller**: `auth.js` → `postLogin`  
**Validation**: `routes/auth.js` (express-validator)

```mermaid
sequenceDiagram
    participant U as User
    participant V as Validator
    participant C as Controller
    participant DB as MongoDB
    participant S as Session

    U->>V: POST /login (email, password)
    
    V->>V: Validate email format
    V->>V: Validate password (5-25 chars, alphanumeric)
    
    alt Validation fails
        V-->>U: Re-render login form with error
    else Validation passes
        V->>C: Call postLogin()
        C->>DB: User.findOne({ email })
        alt User not found
            C-->>U: Flash "email wrong", redirect /login
        else User found
            C->>C: bcrypt.compare(password, user.password)
            alt Password mismatch
                C-->>U: Flash "password wrong", redirect /login
            else Password match
                C->>S: session.isLoggedIn = true
                C->>S: session.user = user
                C->>S: session.save()
                C-->>U: Redirect /
            end
        end
    end
```

### Steps

1. User submits login form with email and password
2. Validator checks email format and password constraints
3. Controller queries database for user by email
4. If user not found, flash error and redirect
5. If user found, compare password with bcrypt
6. If password mismatch, flash error and redirect
7. If password matches, set `session.isLoggedIn = true` and `session.user = user`
8. Save session to MongoDB store
9. Redirect to homepage

## Product Creation (Admin)

**Route**: `POST /admin/add-product`  
**Controller**: `admin.js` → `postAddProduct`  
**Middleware**: `is-auth` (authentication required)

```mermaid
sequenceDiagram
    participant A as Admin
    participant M as multer
    participant V as Validator
    participant C as Controller
    participant FS as File System
    participant DB as MongoDB

    A->>M: POST /admin/add-product (multipart/form-data)
    
    M->>M: Check file type (PNG/JPG/JPEG only)
    alt Invalid file type
        M-->>A: File rejected
    else Valid file
        M->>M: Save to images/ directory
        M->>C: Attach req.file
    end
    
    V->>V: Validate title (min 3 chars)
    V->>V: Validate price (float)
    V->>V: Validate description (5-500 chars)
    
    alt No image provided
        C-->>A: Re-render form with error
    else Validation fails
        C-->>A: Re-render form with validation errors
    else All valid
        C->>C: Create new Product document
        C->>DB: product.save()
        DB-->>C: Product saved
        C-->>A: Redirect /
    end
```

### Steps

1. Admin submits product form with title, price, description, and image
2. Multer processes the multipart form data
3. File type is filtered — only PNG, JPG, JPEG accepted
4. File is saved to `images/` directory with timestamp prefix
5. express-validator validates title (min 3), price (float), description (5-500 chars)
6. If no image is provided, form re-renders with error
7. If validation fails, form re-renders with errors
8. New Product document is created with image path and user reference
9. Product is saved to MongoDB
10. Admin is redirected to homepage

## Product Editing (Admin)

**Route**: `POST /admin/edit-product`  
**Controller**: `admin.js` → `postEditProduct`  
**Middleware**: `is-auth`

### Steps

1. Admin submits edited product form
2. Validator checks title, price, description
3. Controller finds product by ID
4. **Ownership check**: verifies `product.userId === req.user._id`
5. If new image uploaded, old image file is deleted via `fileHelper.deleteFile()`
6. Product fields are updated
7. Product is saved to MongoDB
8. Admin is redirected to homepage

## Add To Cart

**Route**: `POST /cart`  
**Controller**: `shop.js` → `postCart`

### Steps

1. User clicks add-to-cart button (contains `productId`)
2. Controller finds product by ID from request body
3. Calls `req.user.addTocart(product)` (User model method)
4. `addTocart` checks if product already exists in cart:
   - **Yes**: Increments quantity by 1
   - **No**: Adds new item with quantity 1
5. User document is saved with updated cart
6. User is redirected to cart page

```mermaid
sequenceDiagram
    participant U as User
    participant C as Controller
    participant M as User Model
    participant DB as MongoDB

    U->>C: POST /cart (productId)
    C->>DB: Product.findById(productId)
    DB-->>C: Product document
    C->>M: req.user.addTocart(product)
    M->>M: Check if product in cart
    alt Product exists in cart
        M->>M: Increment quantity
    else New product
        M->>M: Add to cart items
    end
    M->>DB: user.save()
    DB-->>M: Success
    C-->>U: Redirect /cart
```

## Remove From Cart

**Route**: `POST /cart-delete-item`  
**Controller**: `shop.js` → `postCartDeleteProduct`

### Steps

1. User clicks delete button on cart item (contains `productId`)
2. Calls `req.user.removeFromCart(productId)`
3. `removeFromCart` filters out the item with matching productId
4. User document is saved with updated cart
5. User is redirected to cart page

## Create Order

**Route**: `POST /create-order`  
**Controller**: `shop.js` → `postOrder`

### Steps

1. User submits order from cart page
2. Controller populates cart items with product details
3. Cart items are mapped to order product format:
   - Product snapshot (full product data spread)
   - Quantity
4. New Order document is created with:
   - User email and userId
   - Products array with snapshots
5. Order is saved to MongoDB
6. `req.user.clearCart()` is called — empties cart
7. User is redirected to orders page

```mermaid
sequenceDiagram
    participant U as User
    participant C as Controller
    participant DB as MongoDB

    U->>C: POST /create-order
    C->>DB: User.populate('cart.items.productId')
    DB-->>C: User with populated cart
    C->>C: Map cart items to order format
    C->>C: Create Order document
    C->>DB: order.save()
    DB-->>C: Order saved
    C->>DB: user.clearCart()
    DB-->>C: Cart cleared
    C-->>U: Redirect /orders
```

## Payment Process (Zarinpal)

### Step 1: Initiate Payment

**Route**: `GET /PaymentRequest`  
**Controller**: `shop.js` → `getPayment`  
**Middleware**: `is-auth`

```mermaid
sequenceDiagram
    participant U as User
    participant C as Controller
    participant Z as Zarinpal API
    participant DB as MongoDB

    U->>C: GET /PaymentRequest
    C->>DB: User.populate('cart.items.productId')
    C->>C: Calculate total price
    C->>Z: PaymentRequest({Amount, CallbackURL, Description, Email})
    alt Payment URL received
        Z-->>C: { url: '...' }
        C-->>U: Redirect to Zarinpal payment page
    else Error
        Z-->>C: Error
        C-->>U: Flash error, redirect /checkout
    end
```

### Step 2: Verify Payment

**Route**: `GET /checkPayment`  
**Controller**: `shop.js` → `checkPayment`  
**Middleware**: `is-auth`

```mermaid
sequenceDiagram
    participant U as User
    participant Z as Zarinpal
    participant C as Controller
    participant DB as MongoDB

    Note over U,DB: Zarinpal redirects back with query params
    U->>C: GET /checkPayment?Authority=xxx&Status=OK
    
    C->>C: Extract Authority and Status from query
    
    alt Status is NOK
        C-->>U: Flash "payment cancelled", redirect /cart
    else Status is OK
        C->>DB: User.populate('cart.items.productId')
        C->>Z: PaymentVerification({Amount, Authority})
        alt Verification success (status 100)
            Z-->>C: { RefID: '...', status: 100 }
            C->>C: Create Order from cart
            C->>DB: order.save()
            C->>DB: user.clearCart()
            C->>U: Flash RefID, redirect /orders
        else Verification failed
            Z-->>C: Error status
            C-->>U: Flash "verification failed", redirect /cart
        end
    end
```

### Payment Flow Summary

1. User clicks "Pay" on checkout page
2. Server calculates total price from cart
3. Zarinpal `PaymentRequest` API is called with amount, callback URL, description
4. User is redirected to Zarinpal payment page
5. User completes payment on Zarinpal
6. Zarinpal redirects to `/checkPayment?Authority=xxx&Status=OK`
7. Server verifies payment via Zarinpal `PaymentVerification` API
8. If verified (status 100):
   - Order is created with product snapshots
   - Cart is cleared
   - RefID is displayed to user
9. If not verified, user is redirected with error

## Invoice Generation

**Route**: `GET /invoices/:orderId`  
**Controller**: `shop.js` → `getInvoices`  
**Middleware**: `is-auth`

```mermaid
sequenceDiagram
    participant U as User
    participant C as Controller
    participant DB as MongoDB
    participant PDF as PDFKit
    participant FS as File System

    U->>C: GET /invoices/:orderId
    C->>DB: Order.findById(orderId)
    DB-->>C: Order document
    
    alt Order not found
        C-->>U: Error "No Order Found"
    else Order found
        C->>C: Ownership check (userId match)
        alt Not owner
            C-->>U: Error "unauthorized"
        else Authorized
            C->>PDF: Create PDFDocument
            PDF->>PDF: Write "Invoices" header
            PDF->>PDF: Write product line items
            PDF->>PDF: Write total price
            PDF->>FS: Pipe to files/invoices/invoices-{orderId}.pdf
            PDF->>U: Pipe PDF response (download)
        end
    end
```

### Steps

1. User clicks invoice download link
2. Controller finds order by ID
3. **Ownership check**: verifies `order.user.userId === req.user._id`
4. PDF document is created with PDFKit
5. Header "Invoices" is written
6. Each product line is written with quantity and price
7. Total price is calculated and written
8. PDF is piped to both:
   - File system: `files/invoices/invoices-{orderId}.pdf`
   - HTTP response: `Content-Type: application/pdf`
9. Browser downloads the PDF file
