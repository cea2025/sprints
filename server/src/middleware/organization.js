/**
 * Organization Middleware
 * Handles multi-tenant organization context for all API requests
 */

const prisma = require('../lib/prisma');

/**
 * Get organization ID from request
 * Priority: 1) X-Organization-Id header, 2) session, 3) first membership
 * 
 * @param {Request} req - Express request object
 * @returns {Promise<string|null>} Organization ID or null
 */
async function getOrganizationId(req) {
  // First check header (set by frontend for each request)
  const headerOrgId = req.headers['x-organization-id'];
  
  if (headerOrgId) {
    // Super admins can access any organization
    if (req.user?.isSuperAdmin) {
      // Verify the organization exists
      const org = await prisma.organization.findUnique({
        where: { id: headerOrgId },
        select: { id: true }
      });
      if (org) return headerOrgId;
    } else {
      // Regular users - verify they have access to this organization
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: { userId: req.user.id, organizationId: headerOrgId }
        }
      });
      if (membership) return headerOrgId;
    }
  }
  
  // Then check session
  if (req.session?.organizationId) {
    return req.session.organizationId;
  }
  
  // Finally, get first membership
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: req.user.id, isActive: true },
    select: { organizationId: true }
  });
  
  return membership?.organizationId || null;
}

/**
 * Middleware to add organizationId to req object
 */
async function requireOrganization(req, res, next) {
  const organizationId = await getOrganizationId(req);
  
  if (!organizationId) {
    return res.status(403).json({ error: 'לא נבחר ארגון' });
  }
  
  req.organizationId = organizationId;
  next();
}

module.exports = {
  getOrganizationId,
  requireOrganization
};

