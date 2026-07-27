const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const { validateCsrf } = require('../middleware/csrf');
const { isGuest } = require('../middleware/auth');

router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Access Authorization - Athstack', error: null });
});

router.post('/login', validateCsrf, isGuest, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('auth/login', { title: 'Access Authorization - Athstack', error: 'Please fill out all fields.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('auth/login', { title: 'Access Authorization - Athstack', error: 'Invalid credentials.' });
    }

    if (user.status !== 'active') {
      return res.render('auth/login', { title: 'Access Authorization - Athstack', error: 'Account suspended or pending activation.' });
    }

    req.session.userId = user.id;
    req.session.userName = `${user.first_name} ${user.last_name}`;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    if (['admin', 'super_admin'].includes(user.role)) {
      return res.redirect('/admin');
    }
    res.redirect('/user');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { title: 'Access Authorization - Athstack', error: 'Server error.' });
  }
});

router.get('/register', isGuest, (req, res) => {
  res.render('auth/register', { title: 'Initialize Profile Node - Athstack', error: null });
});

router.post('/register', validateCsrf, isGuest, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, confirm_password } = req.body;

    if (password !== confirm_password) {
      return res.render('auth/register', { title: 'Initialize Profile Node - Athstack', error: 'Passwords do not match.' });
    }
    if (password.length < 8) {
      return res.render('auth/register', { title: 'Initialize Profile Node - Athstack', error: 'Password must be at least 8 characters.' });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.render('auth/register', { title: 'Initialize Profile Node - Athstack', error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await UserModel.register({ first_name, last_name, email, phone, password: hashed });

    const newUser = await UserModel.findByEmail(email);
    req.session.userId = newUser.id;
    req.session.userName = `${first_name} ${last_name}`;
    req.session.userEmail = email;
    req.session.userRole = 'customer';

    res.redirect('/user');
  } catch (err) {
    console.error(err);
    res.render('auth/register', { title: 'Initialize Profile Node - Athstack', error: 'Registration failed.' });
  }
});

router.get('/forgot', isGuest, (req, res) => {
  res.render('auth/forgot', { title: 'Credential Reset - Athstack' });
});

router.post('/forgot', validateCsrf, isGuest, async (req, res) => {
  res.render('auth/forgot', { title: 'Credential Reset - Athstack' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;
