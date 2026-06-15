# Deployment Guide

## Prerequisites

- Node.js v14+ installed
- MongoDB instance (local or cloud)
- npm or yarn package manager
- Domain name and SSL certificate (for production)

## Environment Variables

Set the following environment variables in production:

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `PORT` | `3000` or your preferred port | Server listening port |
| `HOST` | Your domain name | Used for console output |
| `DATABASE_HOST` | MongoDB connection string host:port | e.g., `mongodb0.example.com:27017` |
| `DATABASE_NAME` | `shop` | MongoDB database name |
| `SESSION_SECRET` | Strong random string | **Critical** — use `openssl rand -hex 32` |
| `SENDGRID_API_KEY` | Your SendGrid API key | For production email |
| `ZARINPAL_MERCHANT_ID` | Your Zarinpal merchant ID | Payment gateway |

## Database Setup

### MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas account
2. Create a cluster
3. Create a database user
4. Whitelist IP addresses
5. Get connection string

```env
DATABASE_HOST=cluster0.xxxxx.mongodb.net
DATABASE_NAME=shop
```

Update connection URI in `app.js`:

```javascript
const MONGODB_URI = `mongodb+srv://${databaseHost}/${databaseName}`;
```

### Self-Hosted MongoDB

1. Install MongoDB
2. Enable authentication
3. Create database and user
4. Configure firewall

```env
DATABASE_HOST=localhost:27017
DATABASE_NAME=shop
```

## Session Store

Sessions are stored in MongoDB via `connect-mongodb-session`. The session collection is created automatically.

### Session Store Requirements

- MongoDB must be accessible from the application
- Session collection is named `session`
- Sessions expire based on MongoDB TTL index (default: 2 weeks)

## Production Setup

### 1. Clone and Install

```bash
git clone https://github.com/tahadeh2010/nodejs-shop.git
cd nodejs-shop
npm install --production
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with production values
```

### 3. Create Required Directories

```bash
mkdir -p images files/invoices
```

### 4. Start Application

```bash
# Using Node.js directly
node app.js

# Using PM2 (recommended)
pm2 start app.js --name shop

# Using systemd (Linux)
# Create /etc/systemd/system/shop.service
```

## Process Management

### PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start app.js --name shop

# View logs
pm2 logs shop

# Restart
pm2 restart shop

# Auto-start on boot
pm2 startup
pm2 save
```

### Systemd Service (Linux)

```ini
[Unit]
Description=NodeJS Shop
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/nodejs-shop
ExecStart=/usr/bin/node app.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Reverse Proxy Configuration

### Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### With SSL (Let's Encrypt)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

## Security Hardening

### 1. Environment Variables

```bash
# Generate strong session secret
openssl rand -hex 32
```

### 2. Security Headers (Recommended)

Add `helmet` middleware:

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 3. Rate Limiting (Recommended)

Add rate limiting on auth routes:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts'
});

app.use('/login', loginLimiter);
app.use('/signup', loginLimiter);
```

### 4. HTTPS Enforcement

```javascript
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});
```

### 5. Cookie Security

Update session configuration:

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));
```

## File Upload Handling

### Directory Permissions

```bash
chmod 755 images
chmod 755 files/invoices
chown www-data:www-data images files/invoices
```

### Disk Space Monitoring

Monitor disk space for uploaded images and generated invoices.

## Monitoring and Logging

### Application Logs

```bash
# PM2 logs
pm2 logs shop

# Systemd logs
journalctl -u shop -f
```

### Error Monitoring

Consider adding:

- Sentry for error tracking
- PM2 monit for process monitoring
- MongoDB Atlas monitoring

## Backup Strategy

### MongoDB Backup

```bash
# Manual backup
mongodump --db shop --out /backup/$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --db shop --out /backup/$DATE
find /backup -mtime +30 -delete
```

### Application Backup

```bash
# Backup uploaded files
tar -czf files-backup-$(date +%Y%m%d).tar.gz images/ files/
```

## Deployment Checklist

- [ ] Set strong `SESSION_SECRET`
- [ ] Configure MongoDB connection
- [ ] Set `NODE_ENV=production`
- [ ] Configure reverse proxy with SSL
- [ ] Set up process manager (PM2/systemd)
- [ ] Configure file upload directories
- [ ] Set up automated backups
- [ ] Configure error monitoring
- [ ] Set up log rotation
- [ ] Test payment gateway in production
- [ ] Verify email delivery
- [ ] Monitor disk space
- [ ] Set up uptime monitoring
