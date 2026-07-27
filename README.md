# Athstack Digital Hub

Premium e-commerce platform for tech hardware provisioning, device repair services, and professional training courses. Built with Node.js, Express, EJS, and MySQL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 4 |
| View Engine | EJS |
| Database | MySQL 8 (mysql2/promise) |
| Session | express-session + connect-flash |
| Security | Helmet, CORS, HPP, Rate Limiting |
| Frontend | Bootstrap 5, Font Awesome 6, Custom CSS (Electric Cyber Dark theme) |

## Features

### Public
- **Shop** - Browse, filter, search products with pagination and category filtering
- **Maintenance** - View services, book device repairs online with reference tracking
- **Training Academy** - Browse courses, enroll with progress tracking
- **Contact** - Contact form with admin inbox

### Customer Dashboard (`/dashboard`)
- Order history, repair request tracking, enrolled courses
- Profile management with avatar upload
- Wishlist

### Technician Panel (`/technician`)
- Product CRUD (create, edit, delete own products)
- Repair request management with status updates and notes
- Order viewing for own products

### Admin Panel (`/admin`)
- Full user management (role changes, status toggling)
- Product inventory management
- Repair request assignment to technicians
- Order status management
- Training course creation and management
- Contact message inbox
- System settings

## Project Structure

```
athstack_digital_hub/
  app.js                    # Express app configuration
  server.js                 # Entry point (starts server)
  config/
    db.js                   # MySQL pool + query/queryOne helpers
  controllers/              # 11 route controllers
    homeController.js
    shopController.js
    repairController.js
    trainingController.js
    aboutController.js
    contactController.js
    authController.js
    cartController.js
    customerController.js
    technicianController.js
    adminController.js
  models/                   # 12 data models
    UserModel.js
    ProductModel.js
    CategoryModel.js
    OrderModel.js
    RepairModel.js
    ServiceModel.js
    CourseModel.js
    ReviewModel.js
    NotificationModel.js
    ContactModel.js
    SettingModel.js
    WishlistModel.js
  routes/                   # 12 route files
    home.js, shop.js, maintenance.js, training.js,
    about.js, contact.js, auth.js, cart.js,
    admin.js, dashboard.js, technician.js, api.js
  middleware/
    auth.js                 # RBAC: attachUser, isAuthenticated, isCustomer, isTechnician, isAdmin
    csrf.js                 # CSRF token generation + validation
    upload.js               # Multer file upload (products, profiles, services)
    errorHandler.js         # Global error handler + AppError class
  validators/
    authValidators.js       # Register + login validation
    productValidators.js    # Product create/update validation
    contactValidator.js     # Contact form validation
  utils/
    helpers.js              # formatCurrency, formatDate, getStatusBadgeClass, generateSlug, paginate
  views/                    # 35+ EJS templates
    partials/               # header, footer, sidebar, techSidebar, adminSidebar
    home/, shop/, maintenance/, training/, about/, contact/
    auth/                   # login, register, forgot
    cart/
    dashboard/              # customer dashboard (index, orders, repairs, training, profile, wishlist)
    technician/             # technician panel (dashboard, products, products-add, products-edit, repairs, orders)
    admin/                  # admin panel (dashboard, users, products, repairs, orders, training, inbox, settings)
  database/
    schema.sql              # 16 tables (users, products, orders, repairs, enrollments, etc.)
    seeds.sql               # Sample data for development
  public/
    assets/css/style.css    # Electric Cyber Dark theme
    assets/js/main.js       # Client-side JS (live search, form validation, flash auto-dismiss)
    uploads/                # User-uploaded files (products, profiles, courses, services)
```

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+
- npm

### Installation

```bash
git clone https://github.com/athstack/athstack_digital_hub.git
cd athstack_digital_hub
npm install
```

### Database Setup

```bash
# Create the database and tables
mysql -u root -p < database/schema.sql

# Load sample data (optional)
mysql -u root -p athstack_digital_hub < database/seeds.sql
```

### Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=athstack_digital_hub
DB_PORT=3306
SESSION_SECRET=your_session_secret
PORT=3000
```

### Running

```bash
npm start
```

The app runs at `http://localhost:3000`.

### Development Mode

```bash
npm run dev
```

Uses Node.js `--watch` for automatic restarts on file changes.

## Default Accounts (from seeds.sql)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@athstack.com | Admin@123 |
| Technician | tech@athstack.com | Tech@123 |
| Customer | customer@athstack.com | Customer@123 |

## Database Schema

16 tables with full relational integrity:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with RBAC roles |
| `product_categories` | Product category taxonomy |
| `products` | Products with pricing, stock, technician ownership |
| `product_images` | Gallery images per product |
| `services` | Repair service catalog (computer/phone) |
| `repair_requests` | Repair bookings with status tracking |
| `repair_updates` | Status change timeline per repair |
| `orders` | Customer orders with payment tracking |
| `order_items` | Line items per order with technician attribution |
| `training_courses` | Course catalog with enrollment limits |
| `enrollments` | Student course enrollments with progress |
| `reviews` | Product/technician/service reviews |
| `notifications` | User notification system |
| `contact_messages` | Contact form submissions |
| `settings` | System configuration key-value store |
| `wishlists` | User product wishlists |

## Security Features

- **CSRF Protection** - Token-based CSRF on all state-changing requests
- **Rate Limiting** - Auth routes: 100 req/15min, Global: 1000 req/15min
- **Helmet** - HTTP security headers with CSP for CDN assets
- **HPP** - HTTP parameter pollution protection
- **RBAC** - Role-based access control (customer/technician/admin)
- **Session Security** - httpOnly cookies, sameSite lax, 2hr expiry
- **Input Validation** - express-validator on auth, product, and contact forms
- **File Upload Security** - Type filtering (images only), 5MB limit

## License

Proprietary - Athstack Digital Hub
