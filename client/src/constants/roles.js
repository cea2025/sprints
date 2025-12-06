/**
 * Role Constants and Permissions (Frontend)
 * 
 * Mirror of server/src/constants/roles.js
 * Keep in sync with backend!
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
};

export const ROLE_HIERARCHY = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.MEMBER,
  ROLES.VIEWER
];

export const PERMISSIONS = {
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
  'stories:update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER],
  'stories:delete': [ROLES.ADMIN, ROLES.MANAGER],

  // Dashboard
  'dashboard:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.VIEWER],
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'מנהל מערכת',
  [ROLES.MANAGER]: 'מנהל',
  [ROLES.MEMBER]: 'חבר צוות',
  [ROLES.VIEWER]: 'צופה'
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'גישה מלאה לכל המערכת כולל ניהול משתמשים',
  [ROLES.MANAGER]: 'יצירה, עריכה ומחיקה של סלעים, ספרינטים ומשימות',
  [ROLES.MEMBER]: 'צפייה בכל + עריכת משימות משלו',
  [ROLES.VIEWER]: 'צפייה בלבד'
};

export const ROLE_COLORS = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [ROLES.MANAGER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [ROLES.MEMBER]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [ROLES.VIEWER]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
};

export function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

export function isRoleAtLeast(userRole, requiredRole) {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex <= requiredIndex;
}

