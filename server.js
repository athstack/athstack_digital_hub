require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const { generateToken } = require('./middleware/csrf');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'athstack_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 }
}));

// CSRF + global template data
app.use(generateToken);

// Routes
app.use('/', require('./routes/home'));
app.use('/about', require('./routes/about'));
app.use('/contact', require('./routes/contact'));
app.use('/shop', require('./routes/shop'));
app.use('/maintenance', require('./routes/maintenance'));
app.use('/training', require('./routes/training'));
app.use('/auth', require('./routes/auth'));
app.use('/cart', require('./routes/cart'));
app.use('/admin', require('./routes/admin'));
app.use('/user', require('./routes/user'));

// 404
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Athstack Digital Hub</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
    <link href="/assets/css/style.css" rel="stylesheet">
    </head><body>
    <div class="container py-5 my-5 text-center">
        <h1 class="display-1 text-primary fw-bold">404</h1>
        <p class="text-muted fs-4">Route target unresolvable inside Athstack Engine.</p>
        <a href="/" class="btn btn-premium-primary rounded-pill px-4">Return Home</a>
    </div>
    </body></html>
  `);
});

app.listen(PORT, () => {
  console.log(`Athstack Digital Hub running at http://localhost:${PORT}`);
});
