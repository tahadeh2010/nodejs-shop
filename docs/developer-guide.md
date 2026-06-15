# Developer Guide

## Local Setup

### Prerequisites

- Node.js v14+ (check with `node --version`)
- npm (check with `npm --version`)
- MongoDB running locally or accessible remotely

### Installation

```bash
# Clone the repository
git clone https://github.com/tahadeh2010/nodejs-shop.git
cd nodejs-shop

# Install dependencies
npm install
```

### Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
```

**Required variables:**

```env
PORT=3000
HOST=localhost
DATABASE_HOST=localhost:27017
DATABASE_NAME=shop
SESSION_SECRET=your-secret-key-here
```

### Start MongoDB

If running locally:

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Run the Application

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
node app.js
```

The server starts at `http://localhost:3000`.

## Development Workflow

### File Structure

When adding new features, follow the existing MVC pattern:

1. **Model** (`models/`): Define Mongoose schema
2. **Controller** (`controllers/`): Add business logic
3. **Route** (`routes/`): Define URL endpoints
4. **View** (`views/`): Create EJS template

### Adding a New Route

1. Define the route in the appropriate router file (`routes/admin.js`, `routes/shop.js`, or `routes/auth.js`)
2. Create the controller method
3. Create the EJS view template
4. Add validation if needed (express-validator)
5. Add `is-auth` middleware if the route requires authentication

### Adding a New Model

1. Create a new file in `models/`
2. Define the Mongoose schema
3. Export the model
4. Use in controllers as needed

### Adding a New Controller

1. Create a new file in `controllers/`
2. Export handler functions
3. Import in the appropriate router file

## Coding Conventions

### JavaScript Style

- Use `require()` for imports (CommonJS)
- Use `const` by default, `let` when reassignment is needed
- Avoid `var`
- Use arrow functions for callbacks
- Use async/await for asynchronous operations where possible
- Use template literals for string interpolation

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `is-auth.js`, `file.js` |
| Variables | camelCase | `productId`, `totalPrice` |
| Functions | camelCase | `getProducts`, `postLogin` |
| Constants | UPPER_SNAKE_CASE | `ITEMS_PER_PAGE` |
| Mongoose Models | PascalCase | `Product`, `User`, `Order` |
| Mongoose Schema | camelCase | `productSchema`, `userSchema` |

### EJS Templates

- Use `<%= %>` for escaped output
- Use `<%- %>` for unescaped HTML (only when safe)
- Use `<% %>` for JavaScript logic
- Include partials with `<%- include('./path') %>`

### Error Handling

```javascript
// In controllers
.catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
});
```

### Database Queries

- Use `find()` for list queries
- Use `findById()` for single document lookups
- Use `populate()` for resolving references
- Use `.then().catch()` for promise chains

## Debugging Tips

### Common Issues

**MongoDB Connection Error:**

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check connection string
echo $DATABASE_HOST
```

**Port Already in Use:**

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Session Store Issues:**

```bash
# Check MongoDB connection
mongo
> use shop
> db.session.find()
```

**CSRF Token Errors:**

- Ensure forms include `<input type="hidden" name="_csrf" value="<%= csrfToken %>">`
- Ensure AJAX requests include `csrf-token` header

### Logging

Add temporary logging for debugging:

```javascript
console.log('Debug:', variable);
```

Check MongoDB queries:

```javascript
console.log('Query:', query);
```

### Node Inspector

```bash
# Start with inspector
node --inspect app.js

# Open Chrome DevTools
chrome://inspect
```

## Common Pitfalls

### 1. Forgetting CSRF Token

All forms must include the CSRF token:

```html
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

### 2. Not Handling Async Errors

Always add `.catch()` to promise chains:

```javascript
Product.find()
    .then(products => { ... })
    .catch(err => { ... }); // Don't forget this!
```

### 3. Missing Ownership Checks

Verify resource ownership before modifications:

```javascript
if (product.userId.toString() !== req.user._id.toString()) {
    return res.redirect('/');
}
```

### 4. Forgetting to Populate References

Use `populate()` when you need related data:

```javascript
const user = await req.user.populate('cart.items.productId');
```

### 5. Not Validating Input

Always validate user input:

```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
    return res.status(422).render('form', { errors: errors.array() });
}
```

### 6. Hardcoded Values

Avoid hardcoding values that should be configurable:

```javascript
// Bad
const port = 3000;

// Good
const port = process.env.PORT || 3000;
```

### 7. Not Using Flash Messages

Provide user feedback:

```javascript
req.flash('error', 'Something went wrong');
req.flash('success', 'Operation successful');
```

### 8. Forgetting to Redirect After POST

Always redirect after a successful POST to prevent duplicate submissions:

```javascript
// Good
res.redirect('/products');

// Bad (causes duplicate on refresh)
res.render('products');
```

## Testing

### Manual Testing

1. Start the application: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Test all user flows:
   - Signup and login
   - Add/edit/delete products
   - Add/remove cart items
   - Create order
   - Download invoice

### API Testing

Use tools like Postman or curl:

```bash
# Login
curl -X POST http://localhost:3000/login \
  -d "email=test@example.com&password=password" \
  -c cookies.txt

# Get products
curl http://localhost:3000/products \
  -b cookies.txt
```

## Contributing

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor" not "Moves cursor")
- Keep first line under 50 characters
- Reference issues when applicable

### Pull Request Process

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Update documentation if needed
5. Submit pull request with clear description
