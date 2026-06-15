# Authentication

This document covers the authentication mechanism, session handling, and authorization patterns used in the NodeJS Shop application.

## Authentication Mechanism

The application uses **server-side session-based authentication** with:

- **Password Hashing**: bcryptjs with 12 salt rounds
- **Session Storage**: MongoDB via `connect-mongodb-session`
- **CSRF Protection**: csurf middleware

There is no JWT or token-based API authentication — all authentication is cookie-based session management.

## Password Hashing

Passwords are hashed using `bcryptjs` with **12 salt rounds**:

```javascript
// controllers/auth.js - postSignup
bcrypt.hash(password, 12).then(hashedPassword => {
    const user = new User({ password: hashedPassword, ... });
});
```

Password verification during login:

```javascript
// controllers/auth.js - postLogin
bcrypt.compare(password, user.password).then(isMatch => {
    if (isMatch) {
        req.session.isLoggedIn = true;
        req.session.user = user;
    }
});
```

## Session Configuration

### Setup (app.js)

```mermaid
graph TD
    A[express-session] --> B[connect-mongodb-session]
    B --> C[(MongoDB 'session' collection)]
    
    subgraph Session Config
        D[secret: SESSION_SECRET]
        E[resave: false]
        F[saveUninitialized: false]
        G[store: MongoDBStore]
    end
```

### Session Data Structure

```javascript
{
    isLoggedIn: true,          // Boolean flag for auth state
    user: {                    // User object from MongoDB
        _id: ObjectId,
        email: String,
        name: String,
        password: String,      // Hashed password (included)
        cart: { items: [...] }
    }
}
```

### Session Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Express Session
    participant DB as MongoDB

    Note over B,DB: After Login
    B->>S: POST /login
    S->>S: Create session object
    S->>DB: Save session document
    DB-->>S: Document saved
    S->>B: Set-Cookie: connect.sid=s%3A...
    
    Note over B,DB: Authenticated Request
    B->>S: GET /cart (Cookie: connect.sid)
    S->>S: Parse cookie, extract session ID
    S->>DB: Find session by ID
    DB-->>S: Session document
    S->>S: Populate req.session
    S->>S: Load user: User.findById(session.user._id)
    S->>S: Attach to req.user
```

## Authorization Middleware

### is-auth.js

The authentication middleware at `middleware/is-auth.js`:

```javascript
module.exports = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    next();
}
```

### Protected Routes

The middleware is applied to:

| Route | Method | Purpose |
|-------|--------|---------|
| `/admin/add-product` | GET, POST | Admin product creation |
| `/admin/products` | GET | Admin product list |
| `/admin/edit-product/:productId` | GET | Admin product edit form |
| `/admin/edit-product` | POST | Admin product update |
| `/admin/product/:productId` | DELETE | Admin product deletion |
| `/checkout` | GET | Checkout page |
| `/PaymentRequest` | GET | Initiate payment |
| `/checkPayment` | GET | Payment verification callback |
| `/invoices/:orderId` | GET | Invoice PDF download |

### Ownership Checks

Beyond the `is-auth` middleware, certain operations verify resource ownership:

- **Product Edit** (`admin.js:182`): Checks `product.userId === req.user._id`
- **Product Delete** (`admin.js:216-219`): Filters by `userId` in the delete query
- **Invoice Download** (`shop.js:350`): Checks `order.user.userId === req.user._id`

## Signup Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Router
    participant V as Validator
    participant C as Controller
    participant M as User Model
    participant DB as MongoDB
    participant E as Email Service

    U->>R: GET /signup
    R->>C: getSignup()
    C->>U: Render signup form

    U->>R: POST /signup (email, password, confirmPassword)
    R->>V: express-validator checks
    alt Validation fails
        V-->>U: Re-render form with errors
    else Validation passes
        V->>C: postSignup()
        C->>M: User.findOne({email})
        M->>DB: Find by email
        DB-->>M: Result
        alt Email exists
            M-->>U: Flash error, redirect /signup
        else New user
            C->>C: bcrypt.hash(password, 12)
            C->>M: new User({...}).save()
            M->>DB: Insert user document
            DB-->>M: Success
            C->>E: Send signup confirmation email
            C->>U: Flash success, redirect /login
        end
    end
```

### Validation Rules (routes/auth.js)

| Field | Rules |
|-------|-------|
| `email` | Must be valid email, normalized, not `test@gmail.com` |
| `password` | Minimum 5 characters, alphanumeric |
| `confimPassword` | Must match `password` |

## Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Router
    participant V as Validator
    participant C as Controller
    participant M as User Model
    participant DB as MongoDB
    participant S as Session Store

    U->>R: GET /login
    R->>C: getLogin()
    C->>U: Render login form

    U->>R: POST /login (email, password)
    R->>V: express-validator checks
    alt Validation fails
        V-->>U: Re-render form with error
    else Validation passes
        V->>C: postLogin()
        C->>M: User.findOne({email})
        M->>DB: Find by email
        DB-->>M: User document
        alt User not found
            M-->>U: Flash error "email wrong", redirect /login
        else User found
            C->>C: bcrypt.compare(password, user.password)
            alt Password mismatch
                C-->>U: Flash error "password wrong", redirect /login
            else Password match
                C->>S: session.isLoggedIn = true
                C->>S: session.user = user
                C->>S: session.save()
                S->>DB: Persist session
                C->>U: Redirect /
            end
        end
    end
```

### Validation Rules (routes/auth.js)

| Field | Rules |
|-------|-------|
| `email` | Must be valid email, normalized |
| `password` | 5-25 characters, alphanumeric |

## Logout Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Router
    participant C as Controller
    participant S as Session Store
    participant DB as MongoDB

    U->>R: POST /logout (with CSRF token)
    R->>C: postLogout()
    C->>S: session.destroy()
    S->>DB: Delete session document
    DB-->>S: Success
    C->>U: Redirect /
```

Logout destroys the session and redirects to the homepage. The session cookie expires.

## Password Reset Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Router
    participant C as Controller
    participant M as User Model
    participant DB as MongoDB
    participant E as Email Service
    participant CR as Crypto

    U->>R: GET /reset
    R->>C: getReset()
    C->>U: Render reset form

    U->>R: POST /reset (email)
    R->>C: postReset()
    C->>CR: crypto.randomBytes(32)
    CR-->>C: Token buffer
    C->>C: token = buffer.toString('hex')
    C->>M: User.findOne({email})
    M->>DB: Find by email
    DB-->>M: User document
    alt User not found
        C-->>U: Flash error, redirect /reset
    else User found
        C->>M: Set resetToken, set expiry (1 hour)
        C->>M: user.save()
        M->>DB: Update user document
        C->>E: Send email with reset link
        C->>U: Redirect /
    end

    Note over U,E: User clicks link in email

    U->>R: GET /reset/:token
    R->>C: getResetPassword()
    C->>M: User.findOne({resetToken, expiry > now})
    M->>DB: Find user by token
    DB-->>M: User document
    alt Token invalid/expired
        C-->>U: Flash error
    else Token valid
        C->>U: Render new password form (userId, token)
    end

    U->>R: POST /new-password (password, userId, passwordToken)
    R->>C: postNewPassword()
    C->>M: User.findOne({resetToken, expiry, _id})
    C->>C: bcrypt.hash(newPassword, 12)
    C->>M: Clear resetToken and expiry
    C->>M: user.save()
    M->>DB: Update password
    C->>U: Redirect /login
```

### Token Details

- Generated using `crypto.randomBytes(32)` converted to hex
- Stored in `user.resetToken`
- Expires after 1 hour (`Date.now() + 3600000`)
- Expiry stored in `user.ExpiredDateresetToken`

## Authentication State in Views

Global template variables set by middleware (app.js:79-83):

```javascript
res.locals.isAuthenticated = req.session.isLoggedIn;  // Boolean
res.locals.csrfToken = req.csrfToken();               // CSRF token string
```

Used in EJS templates for conditional rendering:

```ejs
<% if(isAuthenticated) { %>
    <a href="/cart">Cart</a>
    <a href="/orders">Orders</a>
<% } else { %>
    <a href="/login">Login</a>
    <a href="/signup">Signup</a>
<% } %>
```

## Security Notes

- Sessions are stored in MongoDB (not in memory), surviving server restarts
- CSRF tokens are included in all forms and checked by csurf middleware
- Passwords are never stored in plain text
- The `is-auth` middleware provides route-level protection
- Ownership checks prevent users from modifying other users' products or viewing other users' invoices
- Flash messages provide user feedback without persisting sensitive data
