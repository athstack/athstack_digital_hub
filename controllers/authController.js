const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');

const COUNTRY_DIAL_CODES = {
  NG: '+234', TZ: '+255', KE: '+254', UG: '+256', ZA: '+27',
  GH: '+233', EG: '+20', RW: '+250', ET: '+251', CD: '+243',
  CM: '+237', SN: '+221', US: '+1', GB: '+44', IN: '+91', CN: '+86'
};

exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Access Authorization - Athstack',
    error: null
  });
};

exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Access Authorization - Athstack',
        error: 'Please fill out all fields.'
      });
    }

    const user = await UserModel.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('auth/login', {
        title: 'Access Authorization - Athstack',
        error: 'Invalid email or password.'
      });
    }

    if (user.status && user.status !== 'active') {
      return res.render('auth/login', {
        title: 'Access Authorization - Athstack',
        error: 'Account suspended or pending activation.'
      });
    }

    req.session.userId = user.id;
    req.session.userName = `${user.first_name} ${user.last_name}`;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    const returnTo = req.session.returnTo;
    delete req.session.returnTo;

    if (['admin', 'super_admin'].includes(user.role)) {
      return res.redirect(returnTo || '/admin');
    }
    if (user.role === 'technician') {
      return res.redirect(returnTo || '/technician');
    }
    res.redirect(returnTo || '/dashboard');
  } catch (err) {
    next(err);
  }
};

exports.getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Initialize Profile Node - Athstack',
    error: null
  });
};

exports.postRegister = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, country, password, confirm_password } = req.body;

    if (!first_name || !last_name || !email || !password || !country) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - Athstack',
        error: 'All required fields must be filled out.'
      });
    }

    if (password !== confirm_password) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - Athstack',
        error: 'Passwords do not match.'
      });
    }

    if (password.length < 8) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - Athstack',
        error: 'Password must be at least 8 characters.'
      });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - Athstack',
        error: 'An account with this email already exists.'
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const fullPhone = phone ? `${COUNTRY_DIAL_CODES[country] || ''}${phone.replace(/[\s\-\(\)]/g, '')}` : null;
    await UserModel.create({
      first_name,
      last_name,
      email,
      phone: fullPhone,
      country,
      password: hashed,
      role: 'customer'
    });

    const newUser = await UserModel.findByEmail(email);
    req.session.userId = newUser.id;
    req.session.userName = `${first_name} ${last_name}`;
    req.session.userEmail = email;
    req.session.userRole = 'customer';

    req.flash('success', 'Account created successfully. Welcome to Athstack Digital Hub!');
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
};

exports.getForgot = (req, res) => {
  res.render('auth/forgot', {
    title: 'Credential Reset - Athstack'
  });
};

exports.postForgot = async (req, res, next) => {
  try {
    const { email } = req.body;
    req.flash('info', 'If an account exists with that email, a reset link has been sent.');
    res.redirect('/auth/forgot');
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};
