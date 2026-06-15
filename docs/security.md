# Security Analysis

## CSRF Protection

**Implementation**: `csurf` middleware (global)

```javascript
// app.js
const csrf = csrf();
app.use(csrfProtection);
```

**How it works:**

- A CSRF token is generated per session via `req.csrfToken()`
- Token is passed to all views via `res.locals.csrfToken`
- All forms include `<input type="hidden" name="_csrf" value="<%= csrfToken %>">`
- AJAX DELETE requests include `csrf-token` header

**Current state**: ✅ Implemented globally. All state-changing operations require CSRF token.

## Session Security

**Implementation**: `express-session` with MongoDB store

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,  // MongoDBStore
}));
```

**Security measures:**

- Sessions stored in MongoDB (not in-memory) — survives restarts
- `resave: false` — prevents unnecessary session saves
- `saveUninitialized: false` — prevents empty session creation
- Session secret from environment variable

**Recommendations:**

- ⚠️ Set `SESSION_SECRET` to a strong random string in production
- ⚠️ Add `secure: true` cookie option for HTTPS
- ⚠️ Add `httpOnly: true` cookie option
- ⚠️ Add `sameSite: 'strict'` cookie option

## Password Hashing

**Implementation**: `bcryptjs` with 12 salt rounds

```javascript
// controllers/auth.js - postSignup
bcrypt.hash(password, 12).then(hashedPassword => { ... });

// controllers/auth.js - postLogin
bcrypt.compare(password, user.password).then(isMatch => { ... });
```

**Current state**: ✅ Strong implementation. 12 rounds provides good security.

## Input Validation

**Implementation**: `express-validator` on auth and admin routes

| Route | Validated Fields |
|-------|-----------------|
| POST /signup | email, password, confirmPassword |
| POST /login | email, password |
| POST /admin/add-product | title, price, description |
| POST /admin/edit-product | title, price, description |

**Validation rules:**

- Email: Must be valid format, normalized
- Password: Minimum 5 characters, alphanumeric
- Title: String, minimum 3 characters
- Price: Float
- Description: 5-500 characters

**Current state**: ✅ Implemented on critical routes. Some shop routes (POST /cart, POST /create-order) lack explicit validation.

## Authentication Checks

**Implementation**: `is-auth.js` middleware

```javascript
module.exports = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    next();
}
```

**Coverage:**

| Protected Route | Auth Check | Ownership Check |
|----------------|------------|-----------------|
| /admin/* | ✅ is-auth | ✅ userId filter |
| /checkout | ✅ is-auth | — |
| /PaymentRequest | ✅ is-auth | — |
| /checkPayment | ✅ is-auth | — |
| /invoices/:orderId | ✅ is-auth | ✅ userId check |

**Current state**: ✅ Routes requiring auth are protected. Ownership checks prevent unauthorized access to other users' resources.

## File Upload Security

**Implementation**: `multer` with file type filter

```javascript
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
```

**Security measures:**

- File type filtering (PNG, JPG, JPEG only)
- Files stored on disk with timestamp prefix
- No file size limit configured

**Recommendations:**

- ⚠️ Add file size limit (e.g., `limits: { fileSize: 5 * 1024 * 1024 }`)
- ⚠️ Validate file extension separately from MIME type
- ⚠️ Store uploads outside public directory
- ⚠️ Use random filenames to prevent path traversal

## XSS Protection

**Current state**: ⚠️ Limited

- EJS templates auto-escape HTML by default (`<%= %>`)
- No additional sanitization middleware
- No Content Security Policy headers

**Recommendations:**

- Add `helmet` middleware for security headers
- Add Content Security Policy
- Add XSS sanitization for user-generated content

## Additional Security Concerns

### Hardcoded Credentials

```javascript
// util/email.js - Mailtrap credentials hardcoded
auth: {
    user: "e5f55cf49158ed",
    pass: "7e18f7cc6c612d"
}
```

**Risk**: Email credentials are committed to version control.

**Recommendation**: Move to environment variables.

### Missing Rate Limiting

- No rate limiting on authentication routes
- Vulnerable to brute force attacks

**Recommendation**: Add `express-rate-limit` on `/login`, `/signup`, `/reset`.

### Missing HTTPS Enforcement

- No HTTPS redirect in production
- Sessions can be intercepted

**Recommendation**: Add HTTPS redirect middleware.

### Missing Security Headers

- No `helmet` middleware
- Missing X-Frame-Options, X-Content-Type-Options, etc.

**Recommendation**: Add `helmet` for security headers.

## Security Recommendations Summary

| Priority | Recommendation | Impact |
|----------|---------------|--------|
| 🔴 High | Set strong `SESSION_SECRET` in production | Session security |
| 🔴 High | Move hardcoded email credentials to env vars | Credential security |
| 🔴 High | Add rate limiting on auth routes | Brute force prevention |
| 🟡 Medium | Add `helmet` middleware | Security headers |
| 🟡 Medium | Add file size limits to multer | DoS prevention |
| 🟡 Medium | Add HTTPS enforcement | Transport security |
| 🟡 Medium | Add `secure`, `httpOnly`, `sameSite` cookie options | Session cookie security |
| 🟢 Low | Add CSP headers | XSS prevention |
| 🟢 Low | Validate file extensions on server | Upload security |
| 🟢 Low | Add input sanitization middleware | XSS/injection prevention |
