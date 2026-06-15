# Environment Variables

## Overview

The application uses environment variables for configuration, loaded via `dotenv` from a `.env` file at the project root.

## Configuration

**File**: `.env` (not committed to git)  
**Template**: `.env.example` (committed as reference)

## Variables

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `PORT` | No | `3000` | Server listening port | `3000` |
| `HOST` | Yes | — | Server hostname for console output | `localhost` |
| `DATABASE_HOST` | Yes | — | MongoDB host and port | `localhost:27017` |
| `DATABASE_NAME` | Yes | — | MongoDB database name | `shop` |
| `SESSION_SECRET` | Yes | — | Secret key for session signing | `your-secret-key` |
| `SENDGRID_API_KEY` | No | — | SendGrid API key for email (currently using Mailtrap) | `SG.xxxx` |
| `ZARINPAL_MERCHANT_ID` | No | — | Zarinpal payment gateway merchant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

## Usage in Code

### app.js

```javascript
require("dotenv").config();

let port = process.env.PORT || 3000;
let host = process.env.HOST;
let databaseName = process.env.DATABASE_NAME;
let databaseHost = process.env.DATABASE_HOST;

const MONGODB_URI = `mongodb://${databaseHost}/${databaseName}`;

app.use(session({
    secret: process.env.SESSION_SECRET,
    // ...
}));
```

### controllers/shop.js

```javascript
var zarinpal = ZarinpalCheckout.create(
    process.env.ZARINPAL_MERCHANT_ID || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    true
);
```

### controllers/auth.js

```javascript
// Email service (currently hardcoded to Mailtrap)
// SENDGRID_API_KEY is configured but not actively used
```

## .env.example

```
PORT=3000
HOST=localhost

DATABASE_HOST=localhost:27017
DATABASE_NAME=shop

SESSION_SECRET=

SENDGRID_API_KEY=

ZARINPAL_MERCHANT_ID=
```

## Notes

- `PORT` has a fallback of `3000` if not set
- `HOST` is used only for console output (`URL : http://${host}:${port}/`)
- `SESSION_SECRET` is critical for production — must be a strong random string
- `SENDGRID_API_KEY` is listed but the email utility (`util/email.js`) currently uses hardcoded Mailtrap credentials
- `ZARINPAL_MERCHANT_ID` has a fallback placeholder if not configured
- The `.env` file is excluded from git via `.gitignore`
