const CourseModel = require('../models/CourseModel');
const NotificationModel = require('../models/NotificationModel');
const { pool } = require('../config/db');

exports.getCourses = async (req, res, next) => {
  try {
    const courses = await CourseModel.getActive();
    res.render('training/index', {
      title: req.t('training:index.title'),
      courses
    });
  } catch (err) {
    next(err);
  }
};

exports.getCourse = async (req, res, next) => {
  try {
    const course = await CourseModel.findBySlug(req.params.slug);

    if (!course) {
      req.flash('error', req.t('training:index.flashes.courseNotFound'));
      return res.redirect('/training');
    }

    let isEnrolled = false;
    if (req.session.userId) {
      const enrolled = await CourseModel.isEnrolled(req.session.userId, course.id);
      isEnrolled = !!enrolled;
    }

    res.render('training/view', {
      title: req.t('training:view.title', { courseTitle: course.title }),
      course,
      isEnrolled
    });
  } catch (err) {
    next(err);
  }
};

exports.enrollInCourse = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      req.flash('error', req.t('training:index.flashes.loginRequired'));
      return res.redirect('/auth/login');
    }

    const courseId = parseInt(req.params.id);
    if (!courseId) {
      req.flash('error', req.t('training:index.flashes.invalidCourse'));
      return res.redirect('/training');
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      req.flash('error', req.t('training:index.flashes.courseNotFound'));
      return res.redirect('/training');
    }

    const enrolled = await CourseModel.enroll(req.session.userId, courseId);
    if (enrolled) {
      await NotificationModel.create(req.session.userId, {
        title: req.t('training:index.notifications.title'),
        message: req.t('training:index.notifications.message', { courseTitle: course.title }),
        type: 'course',
        link: '/dashboard/training'
      });
      req.flash('success', req.t('training:index.flashes.enrollSuccess', { courseTitle: course.title }));
    } else {
      req.flash('error', req.t('training:index.flashes.enrollFailed'));
    }

    res.redirect(`/training/${course.slug}`);
  } catch (err) {
    if (err.message === 'Already enrolled') {
      req.flash('error', req.t('training:index.flashes.alreadyEnrolled'));
      return res.redirect(`/training/${req.params.slug || ''}`);
    }
    if (err.message === 'Course is full') {
      req.flash('error', req.t('training:index.flashes.courseFull'));
      return res.redirect('/training');
    }
    next(err);
  }
};
