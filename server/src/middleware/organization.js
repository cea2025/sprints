/**
 * Organization Middleware
 * Handles multi-tenant organization context for all API requests
 * 
 * Security layers:
 * 1. Application-level: Header/Session verification
 * 2. Database-level: Row-Level Security (RLS) - set via SET app.organization_id
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
      if (org) {
        await setDbOrganizationContext(headerOrgId);
        return headerOrgId;
      }
    } else {
      // Regular users - verify they have access to this organization
      // Prefer NEW Membership table, fallback to legacy OrganizationMember
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user.id,
          organizationId: headerOrgId,
          isActive: true
        },
        select: { id: true }
      });

      const legacyMembership = !membership
        ? await prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: { userId: req.user.id, organizationId: headerOrgId }
          },
          select: { id: true, isActive: true }
        })
        : null;

      if (membership || (legacyMembership && legacyMembership.isActive !== false)) {
        await setDbOrganizationContext(headerOrgId);
        return headerOrgId;
      }
    }
  }
  
  // Then check session
  if (req.session?.organizationId) {
    await setDbOrganizationContext(req.session.organizationId);
    return req.session.organizationId;
  }
  
  // Finally, get first membership
  // Prefer NEW Membership, fallback to legacy OrganizationMember
  const membership = await prisma.membership.findFirst({
    where: { userId: req.user.id, isActive: true },
    select: { organizationId: true }
  });

  const legacyMembership = !membership
    ? await prisma.organizationMember.findFirst({
      where: { userId: req.user.id, isActive: true },
      select: { organizationId: true }
    })
    : null;
  
  const orgId = membership?.organizationId || legacyMembership?.organizationId || null;

  if (orgId) {
    await setDbOrganizationContext(orgId);
  }
  
  return orgId;
}

/**
 * Set organization context in PostgreSQL for Row-Level Security
 * This ensures that even if application code has a bug,
 * the database will enforce organization isolation
 */
async function setDbOrganizationContext(organizationId) {
  if (!organizationId) return;
  
  try {
    // Set the PostgreSQL session variable for RLS
    await prisma.$executeRawUnsafe(
      `SELECT set_config('app.organization_id', '${organizationId}', false)`
    );
  } catch (error) {
    // RLS function might not exist yet - that's okay
    // Will be created when setup-rls.js runs
    console.debug('RLS context not set (function may not exist yet)');
  }
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

/**
 * Clear organization context (for logout, etc.)
 */
async function clearDbOrganizationContext() {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT set_config('app.organization_id', '', false)`
    );
  } catch (error) {
    // Ignore
  }
}

module.exports = {
  getOrganizationId,
  requireOrganization,
  setDbOrganizationContext,
  clearDbOrganizationContext
};

