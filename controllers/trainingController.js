const CourseModel = require('../models/CourseModel');
const pool = require('../config/db');

exports.getCourses = async (req, res, next) => {
  try {
    const courses = await CourseModel.getActive();
    res.render('training/index', {
      title: 'Professional Engineering Academy - Athstack',
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
      req.flash('error', 'Course not found.');
      return res.redirect('/training');
    }

    let isEnrolled = false;
    if (req.session.userId) {
      const enrolled = await CourseModel.isEnrolled(req.session.userId, course.id);
      isEnrolled = !!enrolled;
    }

    res.render('training/view', {
      title: `${course.title} - Athstack`,
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
      req.flash('error', 'Please log in to enroll in a course.');
      return res.redirect('/auth/login');
    }

    const courseId = parseInt(req.params.id);
    if (!courseId) {
      req.flash('error', 'Invalid course.');
      return res.redirect('/training');
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('/training');
    }

    const enrolled = await CourseModel.enroll(req.session.userId, courseId);
    if (enrolled) {
      req.flash('success', `You have been enrolled in "${course.title}".`);
    } else {
      req.flash('error', 'Enrollment failed. Please try again.');
    }

    res.redirect(`/training/${course.slug}`);
  } catch (err) {
    if (err.message === 'Already enrolled') {
      req.flash('error', 'You are already enrolled in this course.');
      return res.redirect(`/training/${req.params.slug || ''}`);
    }
    if (err.message === 'Course is full') {
      req.flash('error', 'This course has reached maximum enrollment.');
      return res.redirect('/training');
    }
    next(err);
  }
};
