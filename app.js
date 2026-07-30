const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const path = require('path');
const flash = require('connect-flash');

const isVercel = process.env.VERCEL === '1';

const { generateToken } = require('./middleware/csrf');
const { errorHandler } = require('./middleware/errorHandler');
const { attachUser, refreshSessionRole } = require('./middleware/auth');
const { formatDisplayName } = require('./helpers/displayName');

const app = express();

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
if (isVercel) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.URLROOT || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  credentials: true
}));

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------
app.use(compression());

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/auth', authLimiter);
app.use(globalLimiter);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// HTTP parameter pollution protection
// ---------------------------------------------------------------------------
app.use(hpp());

// ---------------------------------------------------------------------------
// Static files
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// View engine
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start without a secure session secret.');
  process.exit(1);
}

let sessionStore;
if (isVercel) {
  const MySQLStore = require('express-mysql-session')(session);
  const { pool } = require('./config/db');
  sessionStore = new MySQLStore({}, pool);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// ---------------------------------------------------------------------------
// Flash messages
// ---------------------------------------------------------------------------
app.use(flash());

// ---------------------------------------------------------------------------
// Global template variables + CSRF + user attachment
// ---------------------------------------------------------------------------
app.use(attachUser);
app.use(refreshSessionRole);
app.use(generateToken);

app.use((req, res, next) => {
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError = req.flash('error');
  res.locals.flashInfo = req.flash('info');
  res.locals.userStatus = (req.session && req.session.userId) ? (req.session.userStatus || 'active') : null;
  res.locals.formatDisplayName = formatDisplayName;
  res.locals.imageUrl = function(path, folder) {
    if (!path) return `/uploads/${folder}/product-placeholder.svg`;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) return path;
    return `/uploads/${folder}/${path}`;
  };
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/', require('./routes/home'));
app.use('/about', require('./routes/about'));
app.use('/contact', require('./routes/contact'));
app.use('/shop', require('./routes/shop'));
app.use('/maintenance', require('./routes/maintenance'));
app.use('/training', require('./routes/training'));
app.use('/auth', require('./routes/auth'));
app.use('/cart', require('./routes/cart'));
app.use('/reviews', require('./routes/reviews'));
app.use('/admin', require('./routes/admin'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/technician', require('./routes/technician'));
app.use('/api', require('./routes/api'));
app.use('/user', (req, res) => res.redirect('/dashboard'));

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found'
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
