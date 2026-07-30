const ContactModel = require('../models/ContactModel');
const NotificationModel = require('../models/NotificationModel');
const UserModel = require('../models/UserModel');

exports.getContact = async (req, res, next) => {
  try {
    const status = req.query.status || null;
    var userPhone = '', userPhoneCode = '', userPhoneNumber = '';
    if (req.session.userId) {
      const profile = await UserModel.findById(req.session.userId);
      userPhone = profile ? (profile.phone || '') : '';
      var codes = ['+255','+254','+256','+250','+257','+27','+1','+44','+49','+33','+61','+86','+91','+971','+234'];
      for (var i = 0; i < codes.length; i++) {
        if (userPhone.startsWith(codes[i])) {
          userPhoneCode = codes[i];
          userPhoneNumber = userPhone.slice(codes[i].length);
          break;
        }
      }
      if (!userPhoneCode) {
        userPhoneNumber = userPhone;
      }
    }
    res.render('contact/index', {
      title: 'Contact Us - TechBridge Digital Hub',
      status,
      userPhone,
      userPhoneCode,
      userPhoneNumber
    });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    var phoneRaw = (req.body.phone || '').trim();
    var countryCode = (req.body.country_code || '').trim();
    if (phoneRaw && !phoneRaw.startsWith('+')) {
      phoneRaw = countryCode + phoneRaw;
    }

    const data = {
      name: (req.body.name || '').trim(),
      email: req.session.userEmail || (req.body.email || '').trim(),
      phone: phoneRaw,
      subject: (req.body.subject || '').trim(),
      message: (req.body.message || '').trim()
    };

    if (!data.name || !data.email || !data.message) {
      req.flash('error', 'Name, email, and message are required.');
      return res.redirect('/contact');
    }

    if (!req.session.userId) {
      req.session.pendingMessage = data;
      req.session.returnTo = '/contact?status=pending';
      req.flash('info', 'Please create an account to send your message.');
      return res.redirect('/auth/register');
    }

    data.user_id = req.session.userId;

    const msg = await ContactModel.create(data);
    NotificationModel.notifyAdmins({
      title: 'New Contact Message',
      message: `${data.name} sent a message${data.subject ? ': ' + data.subject : ''}`,
      type: 'contact',
      link: '/admin/inbox'
    }).catch(() => {});
    req.flash('success', 'Your message has been sent. We will get back to you shortly.');
    res.redirect('/contact?status=success');
  } catch (err) {
    next(err);
  }
};
