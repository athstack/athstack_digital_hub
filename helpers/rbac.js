/**
 * RBAC data-access layer.
 *
 * Loads the effective permission set for a user from the database:
 *   1. Base permissions come from `role_permissions` (the default set per role).
 *   2. Per-user overrides come from `user_permissions` (granted = 1 adds a
 *      permission, granted = 0 revokes it).
 *   3. super_admin is implicitly granted every permission.
 *
 * Authorization logic lives here (and in middleware/rbac.js) so controllers
 * never have to re-implement permission checks.
 */
const { pool } = require('../config/db');
const { ALL_PERMISSIONS, ROLES } = require('../config/permissions');

/**
 * Returns the effective Set of permission strings for a user.
 * @param {number} userId
 * @param {string} role
 * @returns {Promise<Set<string>>}
 */
async function getUserPermissionSet(userId, role) {
  if (role === ROLES.SUPER_ADMIN) {
    return new Set(ALL_PERMISSIONS);
  }

  const [roleRows] = await pool.execute(
    'SELECT permission FROM role_permissions WHERE role = ?',
    [role]
  );
  const permissions = new Set(roleRows.map((r) => r.permission));

  if (userId) {
    const [overrideRows] = await pool.execute(
      'SELECT permission, granted FROM user_permissions WHERE user_id = ?',
      [userId]
    );
    overrideRows.forEach((row) => {
      if (Number(row.granted) === 1) {
        permissions.add(row.permission);
      } else {
        permissions.delete(row.permission);
      }
    });
  }

  return permissions;
}

/**
 * Returns the list of permissions granted to a role from role_permissions
 * (used by the Role Management UI).
 * @param {string} role
 * @returns {Promise<string[]>}
 */
async function getRolePermissions(role) {
  const [rows] = await pool.execute(
    'SELECT permission FROM role_permissions WHERE role = ?',
    [role]
  );
  return rows.map((r) => r.permission);
}

/**
 * Replaces the complete permission set of a role.
 * @param {string} role
 * @param {string[]} permissions
 */
async function setRolePermissions(role, permissions) {
  const unique = [...new Set(permissions)];
  await pool.execute('DELETE FROM role_permissions WHERE role = ?', [role]);
  for (const permission of unique) {
    await pool.execute(
      'INSERT INTO role_permissions (role, permission) VALUES (?, ?)',
      [role, permission]
    );
  }
  return unique;
}

/**
 * List the canonical permissions stored in the permissions catalog table.
 * @returns {Promise<Array>}
 */
async function getCatalogPermissions() {
  const [rows] = await pool.execute(
    'SELECT id, permission, module, description FROM permissions ORDER BY module, permission'
  );
  return rows;
}

/**
 * Registers a new permission in the catalog table (idempotent).
 * @param {string} permission
 * @param {string} module
 * @param {string} description
 */
async function addCatalogPermission(permission, module = 'general', description = null) {
  await pool.execute(
    'INSERT IGNORE INTO permissions (permission, module, description) VALUES (?, ?, ?)',
    [permission, module, description]
  );
}

module.exports = {
  getUserPermissionSet,
  getRolePermissions,
  setRolePermissions,
  getCatalogPermissions,
  addCatalogPermission
};
