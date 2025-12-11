/**
 * Principal Middleware (RBAC v2 foundation)
 *
 * Attaches a normalized principal to the request:
 * req.principal = {
 *   organizationId,
 *   userId,
 *   membershipId,
 *   role,
 *   teamIds,
 *   featureFlags
 * }
 *
 * Backwards compatible:
 * - If Membership doesn't exist, falls back to legacy OrganizationMember role + req.user.role.
 * - Does NOT enforce any authorization by itself.
 */

const prisma = require('../lib/prisma');
const { getOrganizationId } = require('./organization');
const { getFeatureFlagsMap } = require('../services/featureFlags');

async function attachPrincipal(req, res, next) {
  try {
    if (!req.user) return next();

    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      req.principal = null;
      return next();
    }

    // Also expose orgId directly for convenience (many routes already use getOrganizationId)
    req.organizationId = organizationId;

    // Prefer NEW Membership (userId+organizationId)
    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.id, organizationId, isActive: true },
      select: { id: true, role: true }
    });

    // Fallback to legacy OrganizationMember for role (during migration)
    let legacyOrgMember = null;
    if (!membership) {
      legacyOrgMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: { userId: req.user.id, organizationId }
        },
        select: { role: true, isActive: true }
      });
    }

    const role = membership?.role || legacyOrgMember?.role || req.user.role || 'VIEWER';

    // Load team IDs (only if membership exists)
    const teamIds = membership
      ? (
        await prisma.teamMembership.findMany({
          where: {
            membershipId: membership.id,
            team: { isActive: true, organizationId }
          },
          select: { teamId: true }
        })
      ).map((tm) => tm.teamId)
      : [];

    const featureFlags = await getFeatureFlagsMap(organizationId);

    req.principal = {
      organizationId,
      userId: req.user.id,
      membershipId: membership?.id || null,
      role,
      teamIds,
      featureFlags,
      isSuperAdmin: req.user.isSuperAdmin === true
    };

    return next();
  } catch (err) {
    // Never break requests because principal resolution failed
    console.error('Principal middleware error:', err);
    req.principal = null;
    return next();
  }
}

module.exports = {
  attachPrincipal
};


