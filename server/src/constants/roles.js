/**
 * Role Constants and Permissions
 * 
 * This file defines all roles and their permissions in the system.
 * Keep this as the single source of truth for authorization.
 */

// Available roles in order of privilege (highest first)
const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
};

// Role hierarchy - higher index = lower privilege
const ROLE_HIERARCHY = [
  ROLES.ADMIN,    // 0 - highest
  ROLES.MANAGER,  // 1
  ROLES.MEMBER,   // 2
  ROLES.VIEWER    // 3 - lowest
];

// Permissions matrix
const PERMISSIONS = {
  // User management
  'users:read': [ROLES.ADMIN],
  'users:create': [ROLES.ADMIN],
  'users:update': [ROLES.ADMIN],
  'users:delete': [ROLES.ADMIN],
  'users:manage-roles': [ROLES.ADMIN],

  // Team management
  'team:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER],
  'team:create': [ROLES.ADMIN, ROLES.MANAGER],
  'team:update': [ROLES.ADMIN, ROLES.MANAGER],
  'team:delete': [ROLES.ADMIN],

  // Rocks management
  'rocks:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER],
  'rocks:create': [ROLES.ADMIN, ROLES.MANAGER],
  'rocks:update': [ROLES.ADMIN, ROLES.MANAGER],
  'rocks:delete': [ROLES.ADMIN, ROLES.MANAGER],

  // Sprints management
  'sprints:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER],
  'sprints:create': [ROLES.ADMIN, ROLES.MANAGER],
  'sprints:update': [ROLES.ADMIN, ROLES.MANAGER],
  'sprints:delete': [ROLES.ADMIN, ROLES.MANAGER],

  // Stories management
  'stories:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER],
  'stories:create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER],
  'stories:update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER], // MEMBER can only update own
  'stories:update-own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER],
  'stories:delete': [ROLES.ADMIN, ROLES.MANAGER],
  'stories:update-status': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER],

  // Dashboard
  'dashboard:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER],
};

// Role display names in Hebrew
const ROLE_LABELS = {
  [ROLES.ADMIN]: 'מנהל מערכת',
  [ROLES.MANAGER]: 'מנהל',
  [ROLES.MEMBER]: 'חבר צוות',
  [ROLES.VIEWER]: 'צופה'
};

// Role descriptions
const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'גישה מלאה לכל המערכת כולל ניהול משתמשים',
  [ROLES.MANAGER]: 'יצירה, עריכה ומחיקה של סלעים, ספרינטים ומשימות',
  [ROLES.MEMBER]: 'צפייה בכל + עריכת משימות משלו',
  [ROLES.VIEWER]: 'צפייה בלבד'
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Check if role1 is higher or equal to role2 in hierarchy
 */
function isRoleAtLeast(userRole, requiredRole) {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex <= requiredIndex;
}

/**
 * Get all permissions for a role
 */
function getPermissionsForRole(role) {
  return Object.entries(PERMISSIONS)
    .filter(([_, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  hasPermission,
  isRoleAtLeast,
  getPermissionsForRole
};

