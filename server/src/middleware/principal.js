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

async function ensureMembership(req, organizationId, legacyOrgMember) {
  // If membership already exists, nothing to do
  const existing = await prisma.membership.findFirst({
    where: { userId: req.user.id, organizationId, isActive: true },
    select: { id: true, role: true }
  });
  if (existing) return existing;

  // Only auto-provision if we have a legacy org member (user has access) OR is super admin
  if (!legacyOrgMember && !req.user?.isSuperAdmin) return null;

  const created = await prisma.membership.upsert({
    where: {
      email_organizationId: { email: req.user.email, organizationId }
    },
    update: {
      userId: req.user.id,
      name: req.user.name,
      role: legacyOrgMember?.role || req.user.role || 'VIEWER',
      isActive: true,
      joinedAt: new Date()
    },
    create: {
      email: req.user.email,
      name: req.user.name,
      userId: req.user.id,
      organizationId,
      role: legacyOrgMember?.role || req.user.role || 'VIEWER',
      isActive: true,
      joinedAt: new Date()
    },
    select: { id: true, role: true }
  });

  // Ensure a default team exists and the membership is in it.
  // This prevents team scoping from hiding all data for newly-provisioned memberships.
  const defaultTeam = await prisma.team.findFirst({
    where: { organizationId, name: 'כללי', isActive: true },
    select: { id: true }
  });
  if (defaultTeam) {
    await prisma.teamMembership.upsert({
      where: { teamId_membershipId: { teamId: defaultTeam.id, membershipId: created.id } },
      update: {},
      create: { teamId: defaultTeam.id, membershipId: created.id }
    });
  }

  return created;
}

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

    // Fallback to legacy OrganizationMember for role (during migration)
    let legacyOrgMember = null;
    legacyOrgMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      },
      select: { role: true, isActive: true }
    });

    // Prefer NEW Membership; auto-provision if missing (safe)
    const membership = await ensureMembership(req, organizationId, legacyOrgMember);

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


