/**
 * Central RBAC configuration.
 *
 * Single source of truth for every permission in the platform. No permission
 * string should be hardcoded in routes, controllers or views — always reference
 * the constants below (or the string literals that resolve to the same values)
 * and validate access through the requirePermission / requireRole middleware.
 *
 * @module config/permissions
 */

const PERMISSIONS = {
  // ---- Platform & users ----------------------------------------------------
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',

  // ---- Products ------------------------------------------------------------
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_CATEGORIES: 'manage_categories',
  MANAGE_INVENTORY: 'manage_inventory',
  CREATE_PRODUCTS: 'create_products',
  EDIT_OWN_PRODUCTS: 'edit_own_products',
  DELETE_OWN_PRODUCTS: 'delete_own_products',

  // ---- Orders & payments ---------------------------------------------------
  MANAGE_ORDERS: 'manage_orders',
  VIEW_OWN_ORDERS: 'view_own_orders',
  MANAGE_PAYMENTS: 'manage_payments',

  // ---- Repairs ---------------------------------------------------------------
  MANAGE_REPAIRS: 'manage_repairs',
  ASSIGN_REPAIRS: 'assign_repairs',
  VIEW_OWN_REPAIRS: 'view_own_repairs',
  BOOK_REPAIRS: 'book_repairs',

  // ---- Marketing ------------------------------------------------------------
  MANAGE_CAMPAIGNS: 'manage_campaigns',
  MANAGE_PROMOTIONS: 'manage_promotions',
  MANAGE_COUPONS: 'manage_coupons',
  MANAGE_FEATURED_PRODUCTS: 'manage_featured_products',
  MANAGE_BLOG: 'manage_blog',
  MANAGE_BANNERS: 'manage_banners',
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  MANAGE_TESTIMONIALS: 'manage_testimonials',
  MANAGE_NEWSLETTERS: 'manage_newsletters',

  // ---- Engagement / content ---------------------------------------------------
  MANAGE_REVIEWS: 'manage_reviews',
  MANAGE_MESSAGES: 'manage_messages',
  MANAGE_SUPPORT: 'manage_support',

  // ---- Reports & analytics -----------------------------------------------------
  VIEW_MARKETING_ANALYTICS: 'view_marketing_analytics',
  VIEW_BUSINESS_REPORTS: 'view_business_reports',
  VIEW_SYSTEM_REPORTS: 'view_system_reports',

  // ---- System --------------------------------------------------------------------
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_WEBSITE: 'manage_website',

  // ---- Training / services (existing platform modules) -----------------------------
  MANAGE_TRAINING: 'manage_training',
  MANAGE_SERVICES: 'manage_services',

  // ---- Account -----------------------------------------------------------------------
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_PROFILE: 'manage_profile',
  BUY_PRODUCTS: 'buy_products'
};

/** Every permission string in the catalog. */
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * Permission catalog grouped by module. Used by the Permission Management UI
 * and by the per-user permission editor.
 */
const PERMISSION_MODULES = [
  { key: 'platform', label: 'permissions:modules.platform', permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES, PERMISSIONS.MANAGE_PERMISSIONS] },
  { key: 'products', label: 'permissions:modules.products', permissions: [PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.MANAGE_CATEGORIES, PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.CREATE_PRODUCTS, PERMISSIONS.EDIT_OWN_PRODUCTS, PERMISSIONS.DELETE_OWN_PRODUCTS] },
  { key: 'orders', label: 'permissions:modules.orders', permissions: [PERMISSIONS.MANAGE_ORDERS, PERMISSIONS.VIEW_OWN_ORDERS, PERMISSIONS.MANAGE_PAYMENTS] },
  { key: 'repairs', label: 'permissions:modules.repairs', permissions: [PERMISSIONS.MANAGE_REPAIRS, PERMISSIONS.ASSIGN_REPAIRS, PERMISSIONS.VIEW_OWN_REPAIRS, PERMISSIONS.BOOK_REPAIRS] },
  { key: 'marketing', label: 'permissions:modules.marketing', permissions: [PERMISSIONS.MANAGE_CAMPAIGNS, PERMISSIONS.MANAGE_PROMOTIONS, PERMISSIONS.MANAGE_COUPONS, PERMISSIONS.MANAGE_FEATURED_PRODUCTS, PERMISSIONS.MANAGE_BLOG, PERMISSIONS.MANAGE_BANNERS, PERMISSIONS.MANAGE_ANNOUNCEMENTS, PERMISSIONS.MANAGE_TESTIMONIALS, PERMISSIONS.MANAGE_NEWSLETTERS] },
  { key: 'engagement', label: 'permissions:modules.engagement', permissions: [PERMISSIONS.MANAGE_REVIEWS, PERMISSIONS.MANAGE_MESSAGES, PERMISSIONS.MANAGE_SUPPORT] },
  { key: 'reports', label: 'permissions:modules.reports', permissions: [PERMISSIONS.VIEW_MARKETING_ANALYTICS, PERMISSIONS.VIEW_BUSINESS_REPORTS, PERMISSIONS.VIEW_SYSTEM_REPORTS] },
  { key: 'system', label: 'permissions:modules.system', permissions: [PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.MANAGE_WEBSITE, PERMISSIONS.MANAGE_TRAINING, PERMISSIONS.MANAGE_SERVICES] },
  { key: 'account', label: 'permissions:modules.account', permissions: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_PROFILE, PERMISSIONS.BUY_PRODUCTS] }
];

/**
 * Default permission set granted to each role.
 *
 * super_admin intentionally receives every permission (unrestricted access).
 * Every other role receives only the permissions required to perform its job.
 */
const ROLE_PERMISSIONS = {
  super_admin: ALL_PERMISSIONS,

  admin: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.MANAGE_REPAIRS,
    PERMISSIONS.ASSIGN_REPAIRS,
    PERMISSIONS.MANAGE_REVIEWS,
    PERMISSIONS.MANAGE_MESSAGES,
    PERMISSIONS.MANAGE_SUPPORT,
    PERMISSIONS.VIEW_BUSINESS_REPORTS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_TRAINING,
    PERMISSIONS.MANAGE_SERVICES,
    PERMISSIONS.MANAGE_PROFILE
  ],

  marketing_officer: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_CAMPAIGNS,
    PERMISSIONS.MANAGE_PROMOTIONS,
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.MANAGE_FEATURED_PRODUCTS,
    PERMISSIONS.MANAGE_BLOG,
    PERMISSIONS.MANAGE_BANNERS,
    PERMISSIONS.MANAGE_ANNOUNCEMENTS,
    PERMISSIONS.MANAGE_TESTIMONIALS,
    PERMISSIONS.MANAGE_NEWSLETTERS,
    PERMISSIONS.MANAGE_REVIEWS,
    PERMISSIONS.MANAGE_MESSAGES,
    PERMISSIONS.VIEW_MARKETING_ANALYTICS,
    PERMISSIONS.MANAGE_PROFILE,
    PERMISSIONS.MANAGE_SETTINGS
  ],

  technician: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.EDIT_OWN_PRODUCTS,
    PERMISSIONS.DELETE_OWN_PRODUCTS,
    PERMISSIONS.VIEW_OWN_ORDERS,
    PERMISSIONS.MANAGE_REPAIRS, // scoped to repairs assigned to the technician (enforced in controllers)
    PERMISSIONS.MANAGE_MESSAGES,
    PERMISSIONS.MANAGE_PROFILE
  ],

  customer: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.BUY_PRODUCTS,
    PERMISSIONS.BOOK_REPAIRS,
    PERMISSIONS.VIEW_OWN_ORDERS,
    PERMISSIONS.VIEW_OWN_REPAIRS,
    PERMISSIONS.MANAGE_REVIEWS,
    PERMISSIONS.MANAGE_MESSAGES,
    PERMISSIONS.MANAGE_PROFILE
  ]
};

/**
 * Maps legacy namespaced permission names (marketing:campaigns, ...) to their
 * equivalent catalog permission so existing role_permissions/user_permissions
 * rows can be migrated safely.
 */
const LEGACY_PERMISSION_MAP = {
  'marketing:dashboard': PERMISSIONS.VIEW_DASHBOARD,
  'marketing:campaigns': PERMISSIONS.MANAGE_CAMPAIGNS,
  'marketing:promotions': PERMISSIONS.MANAGE_PROMOTIONS,
  'marketing:coupons': PERMISSIONS.MANAGE_COUPONS,
  'marketing:banners': PERMISSIONS.MANAGE_BANNERS,
  'marketing:blog': PERMISSIONS.MANAGE_BLOG,
  'marketing:testimonials': PERMISSIONS.MANAGE_TESTIMONIALS,
  'marketing:announcements': PERMISSIONS.MANAGE_ANNOUNCEMENTS,
  'marketing:reviews': PERMISSIONS.MANAGE_REVIEWS,
  'marketing:feedback': PERMISSIONS.MANAGE_MESSAGES,
  'marketing:newsletters': PERMISSIONS.MANAGE_NEWSLETTERS,
  'marketing:featured_products': PERMISSIONS.MANAGE_FEATURED_PRODUCTS,
  'marketing:analytics': PERMISSIONS.VIEW_MARKETING_ANALYTICS,
  'marketing:reports': PERMISSIONS.VIEW_MARKETING_ANALYTICS,
  'marketing:profile': PERMISSIONS.MANAGE_PROFILE,
  'marketing:settings': PERMISSIONS.MANAGE_SETTINGS
};

/** The five supported roles. */
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MARKETING_OFFICER: 'marketing_officer',
  TECHNICIAN: 'technician',
  CUSTOMER: 'customer'
};

/** Human friendly role names for the Role Management UI. */
const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: 'admin:roles.superAdmin',
  [ROLES.ADMIN]: 'admin:roles.admin',
  [ROLES.MARKETING_OFFICER]: 'admin:roles.marketingOfficer',
  [ROLES.TECHNICIAN]: 'admin:roles.technician',
  [ROLES.CUSTOMER]: 'admin:roles.customer'
};

/** Short human-friendly labels for permissions (used in the Permission Management UI). */
const PERMISSION_LABELS = ALL_PERMISSIONS.reduce((acc, p) => {
  acc[p] = 'permissions:labels.' + p;
  return acc;
}, {});

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  PERMISSION_MODULES,
  PERMISSION_LABELS,
  ROLE_PERMISSIONS,
  ROLES,
  ROLE_NAMES,
  LEGACY_PERMISSION_MAP
};
