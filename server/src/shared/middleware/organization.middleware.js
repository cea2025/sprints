/**
 * Organization Middleware
 * מוודא שכל בקשה מכילה organizationId תקף
 */

const prisma = require('../../lib/prisma');
const { ForbiddenError, BadRequestError } = require('../errors/AppError');

/**
 * מוודא שהמשתמש בחר ארגון ושיש לו גישה אליו
 */
const requireOrganization = async (req, res, next) => {
  try {
    // בדוק אם יש organizationId בsession
    const organizationId = req.session?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'נדרש לבחור ארגון',
        code: 'ORGANIZATION_REQUIRED',
        redirect: '/select-organization'
      });
    }

    // בדוק אם למשתמש יש גישה לארגון זה
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: organizationId
        }
      },
      include: {
        organization: true
      }
    });

    if (!membership || !membership.isActive) {
      return res.status(403).json({
        error: 'אין לך גישה לארגון זה',
        code: 'ORGANIZATION_ACCESS_DENIED'
      });
    }

    if (!membership.organization.isActive) {
      return res.status(403).json({
        error: 'הארגון אינו פעיל',
        code: 'ORGANIZATION_INACTIVE'
      });
    }

    // הוסף את פרטי הארגון לבקשה
    req.organizationId = organizationId;
    req.organization = membership.organization;
    req.organizationRole = membership.role;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * מוודא הרשאה ספציפית בארגון
 */
const requireOrgRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.organizationRole)) {
      return res.status(403).json({
        error: 'אין לך הרשאה לפעולה זו',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        yourRole: req.organizationRole
      });
    }
    next();
  };
};

/**
 * מוסיף organizationId לכל שאילתת Prisma
 * (עבור שימוש עתידי כ-middleware גלובלי)
 */
const addOrgFilter = (req, res, next) => {
  // שמור את הפונקציה המקורית
  req.orgWhere = (where = {}) => ({
    ...where,
    organizationId: req.organizationId
  });
  next();
};

module.exports = {
  requireOrganization,
  requireOrgRole,
  addOrgFilter
};

