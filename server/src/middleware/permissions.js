/**
 * Permissions Middleware
 * 
 * Middleware functions for checking user permissions.
 * Uses the roles constants for authorization logic.
 */

const { hasPermission, isRoleAtLeast, ROLES } = require('../constants/roles');

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'נדרשת התחברות'
    });
  }
  
  if (!req.user.isActive) {
    return res.status(403).json({ 
      error: 'Account Disabled',
      message: 'החשבון שלך מושבת. פנה למנהל המערכת.'
    });
  }
  
  next();
}

/**
 * Middleware to require a specific permission
 * Usage: requirePermission('rocks:create')
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'נדרשת התחברות'
      });
    }

    const userRole = req.user.role || ROLES.VIEWER;
    
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'אין לך הרשאה לבצע פעולה זו',
        required: permission,
        userRole: userRole
      });
    }
    
    next();
  };
}

/**
 * Middleware to require a minimum role level
 * Usage: requireRole('MANAGER')
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'נדרשת התחברות'
      });
    }

    const userRole = req.user.role || ROLES.VIEWER;
    
    if (!isRoleAtLeast(userRole, requiredRole)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'נדרשת רמת הרשאה גבוהה יותר',
        required: requiredRole,
        userRole: userRole
      });
    }
    
    next();
  };
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Middleware to check if user owns a resource or has higher permission
 * Usage: requireOwnershipOr('stories:update', 'ownerId')
 */
function requireOwnershipOr(permission, ownerField = 'ownerId') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'נדרשת התחברות'
      });
    }

    const userRole = req.user.role || ROLES.VIEWER;
    
    // If user has the permission, allow
    if (hasPermission(userRole, permission)) {
      // Check if they have full permission (ADMIN/MANAGER) or just own permission (MEMBER)
      if (isRoleAtLeast(userRole, ROLES.MANAGER)) {
        return next();
      }
    }
    
    // For MEMBER, check ownership
    if (userRole === ROLES.MEMBER) {
      // The resource ownership check happens in the route handler
      // We add a flag to indicate ownership check is needed
      req.checkOwnership = true;
      req.ownerField = ownerField;
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'אין לך הרשאה לבצע פעולה זו'
    });
  };
}

/**
 * Helper to check ownership in route handlers
 */
function isOwner(req, resource, ownerField = 'ownerId') {
  if (!req.user || !resource) return false;
  
  // Check if any of user's teamMembers is the owner
  if (req.user.teamMembers && Array.isArray(req.user.teamMembers) && resource[ownerField]) {
    return req.user.teamMembers.some(tm => tm.id === resource[ownerField]);
  }
  
  return false;
}

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
  requireAdmin,
  requireOwnershipOr,
  isOwner
};

