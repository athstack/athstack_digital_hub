const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const PasswordResetModel = require('../models/PasswordResetModel');
const NotificationModel = require('../models/NotificationModel');

const COUNTRY_DIAL_CODES = {
  NG: '+234', TZ: '+255', KE: '+254', UG: '+256', ZA: '+27',
  GH: '+233', EG: '+20', RW: '+250', ET: '+251', CD: '+243',
  CM: '+237', SN: '+221', US: '+1', GB: '+44', IN: '+91', CN: '+86'
};

exports.getLogin = (req, res) => {
  let error = null;
  if (req.query.error === 'rate_limited') {
    error = 'Too many login attempts. Please try again in 15 minutes.';
  }
  res.render('auth/login', {
    title: 'Access Authorization - TechBridge Digital Hub',
    error
  });
};

exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    const respond = (status, data) => res.status(status).json(data);

    if (!email || !password) {
      const msg = 'Please fill out all fields.';
      if (isAjax) return respond(400, { success: false, message: msg });
      return res.render('auth/login', { title: 'Access Authorization - TechBridge Digital Hub', error: msg });
    }

    const user = await UserModel.findByEmail(email);
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuuab';
    const hashToCheck = user ? user.password : dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatch) {
      const msg = 'Invalid email or password.';
      if (isAjax) return respond(401, { success: false, message: msg });
      return res.render('auth/login', { title: 'Access Authorization - TechBridge Digital Hub', error: msg });
    }

    if (user.status === 'suspended') {
      const msg = 'Your account has been suspended. Please contact support.';
      if (isAjax) return respond(403, { success: false, message: msg });
      return res.render('auth/login', { title: 'Access Authorization - TechBridge Digital Hub', error: msg });
    }

    if (user.status === 'inactive') {
      const msg = 'Your account is inactive. Some features may be limited until your account is activated.';
      if (isAjax) return respond(403, { success: false, message: msg });
    }

    const returnTo = req.session.returnTo;
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user.id;
      req.session.userName = `${user.first_name} ${user.last_name}`;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;
      req.session.userStatus = user.status || 'active';
      req.session.userAvatar = user.avatar || null;
      req.session.userFirstName = user.first_name;
      req.session.userLastName = user.last_name;

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);

        let redirectUrl;
        if (['admin', 'super_admin'].includes(user.role)) {
          redirectUrl = returnTo || '/admin';
        } else if (user.role === 'technician') {
          redirectUrl = returnTo || '/technician';
        } else {
          redirectUrl = returnTo || '/dashboard';
        }

        if (isAjax) return respond(200, { success: true, redirect: redirectUrl });
        res.redirect(redirectUrl);
      });
    });
  } catch (err) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.' });
    }
    next(err);
  }
};

exports.getRegister = (req, res) => {
  var pending = req.session.pendingMessage || null;
  res.render('auth/register', {
    title: 'Initialize Profile Node - TechBridge Digital Hub',
    error: null,
    pendingMessage: pending
  });
};

exports.postRegister = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, country, password, confirm_password } = req.body;

    if (!first_name || !last_name || !email || !password || !country) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - TechBridge Digital Hub',
        error: 'All required fields must be filled out.'
      });
    }

    if (password !== confirm_password) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - TechBridge Digital Hub',
        error: 'Passwords do not match.'
      });
    }

    if (password.length < 8) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - TechBridge Digital Hub',
        error: 'Password must be at least 8 characters.'
      });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.render('auth/register', {
        title: 'Initialize Profile Node - TechBridge Digital Hub',
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

    const returnTo = req.session.returnTo;
    const pendingMsg = req.session.pendingMessage;
    delete req.session.pendingMessage;
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = newUser.id;
      req.session.userName = `${first_name} ${last_name}`;
      req.session.userEmail = email;
      req.session.userRole = 'customer';
      req.session.userAvatar = newUser.avatar || null;
      req.session.userFirstName = first_name;
      req.session.userLastName = last_name;

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);

        if (pendingMsg) {
          delete req.session.pendingMessage;
          pendingMsg.user_id = newUser.id;
          const ContactModel = require('../models/ContactModel');
          ContactModel.create(pendingMsg).then(function() {
            var NotificationModel = require('../models/NotificationModel');
            NotificationModel.notifyAdmins({
              title: 'New Contact Message',
              message: (pendingMsg.name || 'Someone') + ' sent a message' + (pendingMsg.subject ? ': ' + pendingMsg.subject : ''),
              type: 'contact',
              link: '/admin/inbox'
            }).catch(function(){});
          }).catch(function(err){ console.error('Pending message failed:', err); });
        }

        req.flash('success', 'Account created successfully. Welcome to TechBridge Digital Hub!');
        res.redirect(returnTo || '/dashboard');
      });
    });
  } catch (err) {
    next(err);
  }
};

exports.getForgot = (req, res) => {
  res.render('auth/forgot', {
    title: 'Credential Reset - TechBridge Digital Hub'
  });
};

exports.postForgot = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await UserModel.findByEmail(email);
      if (user) {
        const { token } = await PasswordResetModel.create(user.id);
        console.log(`[PASSWORD RESET] ${user.email}: /auth/reset/${token}`);
        await NotificationModel.create(user.id, {
          title: 'Password Reset Request',
          message: 'A password reset was requested. Check the server console for the reset link (or use /auth/reset/TOKEN).',
          type: 'auth',
          link: `/auth/reset/${token}`
        });
      }
    }
    req.flash('info', 'If an account exists with that email, a reset link has been generated.');
    res.redirect('/auth/forgot');
  } catch (err) {
    next(err);
  }
};

exports.getReset = async (req, res, next) => {
  try {
    const tokenData = await PasswordResetModel.findByToken(req.params.token);
    if (!tokenData) {
      req.flash('error', 'This reset link is invalid or has expired.');
      return res.redirect('/auth/forgot');
    }
    res.render('auth/reset', {
      title: 'Reset Password - TechBridge Digital Hub',
      token: req.params.token,
      email: tokenData.email
    });
  } catch (err) {
    next(err);
  }
};

exports.postReset = async (req, res, next) => {
  try {
    const { token, password, confirm_password } = req.body;

    if (!password || !confirm_password) {
      req.flash('error', 'Please fill out all fields.');
      return res.redirect(`/auth/reset/${token}`);
    }

    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect(`/auth/reset/${token}`);
    }

    if (password.length < 8) {
      req.flash('error', 'Password must be at least 8 characters.');
      return res.redirect(`/auth/reset/${token}`);
    }

    const tokenData = await PasswordResetModel.findByToken(token);
    if (!tokenData) {
      req.flash('error', 'This reset link is invalid or has expired.');
      return res.redirect('/auth/forgot');
    }

    const hashed = await bcrypt.hash(password, 10);
    await UserModel.updatePassword(tokenData.user_id, hashed);
    await PasswordResetModel.markUsed(token);

    await NotificationModel.create(tokenData.user_id, {
      title: 'Password Changed',
      message: 'Your password has been successfully changed.',
      type: 'auth',
      link: '/auth/login'
    });

    req.flash('success', 'Password reset successful. Please log in.');
    res.redirect('/auth/login');
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};
