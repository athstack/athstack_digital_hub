const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');
const { isMarketingOfficer, hasPermission, isActive } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProductImages, withUpload } = require('../middleware/upload');

router.use(isMarketingOfficer);

router.get('/', marketingController.getDashboard);

// Campaigns
router.get('/campaigns', hasPermission('marketing:campaigns'), marketingController.getCampaigns);
router.get('/campaigns/new', hasPermission('marketing:campaigns'), marketingController.getCampaignForm);
router.post('/campaigns', hasPermission('marketing:campaigns'), isActive, validateCsrf, marketingController.createCampaign);
router.get('/campaigns/:id/edit', hasPermission('marketing:campaigns'), marketingController.getCampaignForm);
router.post('/campaigns/:id', hasPermission('marketing:campaigns'), isActive, validateCsrf, marketingController.updateCampaign);
router.post('/campaigns/:id/status', hasPermission('marketing:campaigns'), isActive, validateCsrf, marketingController.updateCampaignStatus);

// Promotions (promotional sections)
router.get('/promotions', hasPermission('marketing:promotions'), marketingController.getPromotions);
router.get('/promotions/new', hasPermission('marketing:promotions'), marketingController.getPromotionForm);
router.post('/promotions', hasPermission('marketing:promotions'), isActive, validateCsrf, marketingController.createPromotion);
router.get('/promotions/:id/edit', hasPermission('marketing:promotions'), marketingController.getPromotionForm);
router.post('/promotions/:id', hasPermission('marketing:promotions'), isActive, validateCsrf, marketingController.updatePromotion);
router.post('/promotions/:id/status', hasPermission('marketing:promotions'), isActive, validateCsrf, marketingController.updatePromotionStatus);

// Homepage banners
router.get('/banners', hasPermission('marketing:banners'), marketingController.getBanners);
router.get('/banners/new', hasPermission('marketing:banners'), marketingController.getBannerForm);
router.post('/banners', hasPermission('marketing:banners'), isActive, validateCsrf, marketingController.createBanner);
router.get('/banners/:id/edit', hasPermission('marketing:banners'), marketingController.getBannerForm);
router.post('/banners/:id', hasPermission('marketing:banners'), isActive, validateCsrf, marketingController.updateBanner);
router.post('/banners/:id/status', hasPermission('marketing:banners'), isActive, validateCsrf, marketingController.updateBannerStatus);

// Coupons
router.get('/coupons', hasPermission('marketing:coupons'), marketingController.getCoupons);
router.get('/coupons/new', hasPermission('marketing:coupons'), marketingController.getCouponForm);
router.post('/coupons', hasPermission('marketing:coupons'), isActive, validateCsrf, marketingController.createCoupon);
router.get('/coupons/:id/edit', hasPermission('marketing:coupons'), marketingController.getCouponForm);
router.post('/coupons/:id', hasPermission('marketing:coupons'), isActive, validateCsrf, marketingController.updateCoupon);
router.post('/coupons/:id/status', hasPermission('marketing:coupons'), isActive, validateCsrf, marketingController.updateCouponStatus);

// Featured products + promoted technician products
router.get('/featured-products', hasPermission('marketing:featured_products'), marketingController.getFeaturedProducts);
router.post('/products/:id/featured', hasPermission('marketing:featured_products'), isActive, validateCsrf, marketingController.toggleProductFeatured);
router.post('/products/:id/promoted', hasPermission('marketing:featured_products'), isActive, validateCsrf, marketingController.toggleProductPromoted);

// Blog
router.get('/blog', hasPermission('marketing:blog'), marketingController.getBlog);
router.get('/blog/new', hasPermission('marketing:blog'), marketingController.getBlogForm);
router.post('/blog', hasPermission('marketing:blog'), isActive, validateCsrf, marketingController.createBlogPost);
router.get('/blog/:id/edit', hasPermission('marketing:blog'), marketingController.getBlogForm);
router.post('/blog/:id', hasPermission('marketing:blog'), isActive, validateCsrf, marketingController.updateBlogPost);
router.post('/blog/:id/status', hasPermission('marketing:blog'), isActive, validateCsrf, marketingController.updateBlogPostStatus);
router.post('/blog/:id/delete', hasPermission('marketing:blog'), isActive, validateCsrf, marketingController.deleteBlogPost);

// Testimonials
router.get('/testimonials', hasPermission('marketing:testimonials'), marketingController.getTestimonials);
router.post('/testimonials', hasPermission('marketing:testimonials'), isActive, validateCsrf, marketingController.createTestimonial);
router.post('/testimonials/:id/status', hasPermission('marketing:testimonials'), isActive, validateCsrf, marketingController.updateTestimonialStatus);
router.post('/testimonials/:id/delete', hasPermission('marketing:testimonials'), isActive, validateCsrf, marketingController.deleteTestimonial);

// Announcements
router.get('/announcements', hasPermission('marketing:announcements'), marketingController.getAnnouncements);
router.post('/announcements', hasPermission('marketing:announcements'), isActive, validateCsrf, marketingController.createAnnouncement);
router.post('/announcements/:id/status', hasPermission('marketing:announcements'), isActive, validateCsrf, marketingController.updateAnnouncementStatus);
router.post('/announcements/:id/delete', hasPermission('marketing:announcements'), isActive, validateCsrf, marketingController.deleteAnnouncement);

// Reviews + feedback
router.get('/reviews', hasPermission('marketing:reviews'), marketingController.getReviews);
router.post('/reviews/:id/reply', hasPermission('marketing:reviews'), isActive, validateCsrf, marketingController.replyToReview);
router.post('/reviews/:id/hide', hasPermission('marketing:reviews'), isActive, validateCsrf, marketingController.toggleReviewHidden);
router.get('/feedback', hasPermission('marketing:feedback'), marketingController.getFeedback);

// Newsletters
router.get('/newsletters', hasPermission('marketing:newsletters'), marketingController.getNewsletters);
router.post('/newsletters/subscribers', hasPermission('marketing:newsletters'), isActive, validateCsrf, marketingController.createSubscriber);
router.post('/newsletters/subscribers/:id/status', hasPermission('marketing:newsletters'), isActive, validateCsrf, marketingController.updateSubscriberStatus);
router.post('/newsletters/subscribers/:id/delete', hasPermission('marketing:newsletters'), isActive, validateCsrf, marketingController.deleteSubscriber);
router.post('/newsletters/send', hasPermission('marketing:newsletters'), isActive, validateCsrf, marketingController.sendNewsletter);

// Analytics + reports
router.get('/analytics', hasPermission('marketing:analytics'), marketingController.getAnalytics);
router.get('/analytics/products', hasPermission('marketing:analytics'), marketingController.getProductPerformance);
router.get('/analytics/campaigns', hasPermission('marketing:analytics'), marketingController.getCampaignAnalytics);
router.get('/reports', hasPermission('marketing:reports'), marketingController.getReports);

// Profile + settings
router.get('/profile', hasPermission('marketing:profile'), marketingController.getProfile);
router.post('/profile', hasPermission('marketing:profile'), isActive, validateCsrf, marketingController.updateProfile);
router.get('/settings', hasPermission('marketing:settings'), marketingController.getSettings);
router.post('/settings', hasPermission('marketing:settings'), isActive, validateCsrf, marketingController.updateSettings);

module.exports = router;
