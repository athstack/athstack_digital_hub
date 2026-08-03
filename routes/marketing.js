const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');
const { isMarketingOfficer, isActive } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProductImages, withUpload } = require('../middleware/upload');

router.use(isMarketingOfficer);

router.get('/', requirePermission('view_dashboard'), marketingController.getDashboard);

// Campaigns
router.get('/campaigns', requirePermission('manage_campaigns'), marketingController.getCampaigns);
router.get('/campaigns/new', requirePermission('manage_campaigns'), marketingController.getCampaignForm);
router.post('/campaigns', requirePermission('manage_campaigns'), isActive, validateCsrf, marketingController.createCampaign);
router.get('/campaigns/:id/edit', requirePermission('manage_campaigns'), marketingController.getCampaignForm);
router.post('/campaigns/:id', requirePermission('manage_campaigns'), isActive, validateCsrf, marketingController.updateCampaign);
router.post('/campaigns/:id/status', requirePermission('manage_campaigns'), isActive, validateCsrf, marketingController.updateCampaignStatus);

// Promotions (promotional sections)
router.get('/promotions', requirePermission('manage_promotions'), marketingController.getPromotions);
router.get('/promotions/new', requirePermission('manage_promotions'), marketingController.getPromotionForm);
router.post('/promotions', requirePermission('manage_promotions'), isActive, validateCsrf, marketingController.createPromotion);
router.get('/promotions/:id/edit', requirePermission('manage_promotions'), marketingController.getPromotionForm);
router.post('/promotions/:id', requirePermission('manage_promotions'), isActive, validateCsrf, marketingController.updatePromotion);
router.post('/promotions/:id/status', requirePermission('manage_promotions'), isActive, validateCsrf, marketingController.updatePromotionStatus);

// Homepage banners
router.get('/banners', requirePermission('manage_banners'), marketingController.getBanners);
router.get('/banners/new', requirePermission('manage_banners'), marketingController.getBannerForm);
router.post('/banners', requirePermission('manage_banners'), isActive, validateCsrf, marketingController.createBanner);
router.get('/banners/:id/edit', requirePermission('manage_banners'), marketingController.getBannerForm);
router.post('/banners/:id', requirePermission('manage_banners'), isActive, validateCsrf, marketingController.updateBanner);
router.post('/banners/:id/status', requirePermission('manage_banners'), isActive, validateCsrf, marketingController.updateBannerStatus);

// Coupons
router.get('/coupons', requirePermission('manage_coupons'), marketingController.getCoupons);
router.get('/coupons/new', requirePermission('manage_coupons'), marketingController.getCouponForm);
router.post('/coupons', requirePermission('manage_coupons'), isActive, validateCsrf, marketingController.createCoupon);
router.get('/coupons/:id/edit', requirePermission('manage_coupons'), marketingController.getCouponForm);
router.post('/coupons/:id', requirePermission('manage_coupons'), isActive, validateCsrf, marketingController.updateCoupon);
router.post('/coupons/:id/status', requirePermission('manage_coupons'), isActive, validateCsrf, marketingController.updateCouponStatus);

// Featured products + promoted technician products
router.get('/featured-products', requirePermission('manage_featured_products'), marketingController.getFeaturedProducts);
router.post('/products/:id/featured', requirePermission('manage_featured_products'), isActive, validateCsrf, marketingController.toggleProductFeatured);
router.post('/products/:id/promoted', requirePermission('manage_featured_products'), isActive, validateCsrf, marketingController.toggleProductPromoted);

// Blog
router.get('/blog', requirePermission('manage_blog'), marketingController.getBlog);
router.get('/blog/new', requirePermission('manage_blog'), marketingController.getBlogForm);
router.post('/blog', requirePermission('manage_blog'), isActive, validateCsrf, marketingController.createBlogPost);
router.get('/blog/:id/edit', requirePermission('manage_blog'), marketingController.getBlogForm);
router.post('/blog/:id', requirePermission('manage_blog'), isActive, validateCsrf, marketingController.updateBlogPost);
router.post('/blog/:id/status', requirePermission('manage_blog'), isActive, validateCsrf, marketingController.updateBlogPostStatus);
router.post('/blog/:id/delete', requirePermission('manage_blog'), isActive, validateCsrf, marketingController.deleteBlogPost);

// Testimonials
router.get('/testimonials', requirePermission('manage_testimonials'), marketingController.getTestimonials);
router.post('/testimonials', requirePermission('manage_testimonials'), isActive, validateCsrf, marketingController.createTestimonial);
router.post('/testimonials/:id/status', requirePermission('manage_testimonials'), isActive, validateCsrf, marketingController.updateTestimonialStatus);
router.post('/testimonials/:id/delete', requirePermission('manage_testimonials'), isActive, validateCsrf, marketingController.deleteTestimonial);

// Announcements
router.get('/announcements', requirePermission('manage_announcements'), marketingController.getAnnouncements);
router.post('/announcements', requirePermission('manage_announcements'), isActive, validateCsrf, marketingController.createAnnouncement);
router.post('/announcements/:id/status', requirePermission('manage_announcements'), isActive, validateCsrf, marketingController.updateAnnouncementStatus);
router.post('/announcements/:id/delete', requirePermission('manage_announcements'), isActive, validateCsrf, marketingController.deleteAnnouncement);

// Reviews + feedback
router.get('/reviews', requirePermission('manage_reviews'), marketingController.getReviews);
router.post('/reviews/:id/reply', requirePermission('manage_reviews'), isActive, validateCsrf, marketingController.replyToReview);
router.post('/reviews/:id/hide', requirePermission('manage_reviews'), isActive, validateCsrf, marketingController.toggleReviewHidden);
router.get('/feedback', requirePermission('manage_messages'), marketingController.getFeedback);

// Newsletters
router.get('/newsletters', requirePermission('manage_newsletters'), marketingController.getNewsletters);
router.post('/newsletters/subscribers', requirePermission('manage_newsletters'), isActive, validateCsrf, marketingController.createSubscriber);
router.post('/newsletters/subscribers/:id/status', requirePermission('manage_newsletters'), isActive, validateCsrf, marketingController.updateSubscriberStatus);
router.post('/newsletters/subscribers/:id/delete', requirePermission('manage_newsletters'), isActive, validateCsrf, marketingController.deleteSubscriber);
router.post('/newsletters/send', requirePermission('manage_newsletters'), isActive, validateCsrf, marketingController.sendNewsletter);

// Analytics + reports
router.get('/analytics', requirePermission('view_marketing_analytics'), marketingController.getAnalytics);
router.get('/analytics/products', requirePermission('view_marketing_analytics'), marketingController.getProductPerformance);
router.get('/analytics/campaigns', requirePermission('view_marketing_analytics'), marketingController.getCampaignAnalytics);
router.get('/reports', requirePermission('view_marketing_analytics'), marketingController.getReports);

// Profile + settings
router.get('/profile', requirePermission('manage_profile'), marketingController.getProfile);
router.post('/profile', requirePermission('manage_profile'), isActive, validateCsrf, marketingController.updateProfile);
router.get('/settings', requirePermission('manage_settings'), marketingController.getSettings);
router.post('/settings', requirePermission('manage_settings'), isActive, validateCsrf, marketingController.updateSettings);

module.exports = router;
