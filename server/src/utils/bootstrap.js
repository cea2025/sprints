const prisma = require('../lib/prisma');

/**
 * Bootstrap tasks executed on server start.
 * Must be idempotent and safe (never throws to crash the server).
 */

const DEFAULT_TEAM_NAME = 'כללי';
const DEFAULT_TEAM_DESCRIPTION = 'צוות ברירת מחדל (נוצר אוטומטית)';

function backfillKeyForOrg(orgId) {
  return `bootstrap:default-team-backfill:v1:${orgId}`;
}

async function ensureGlobalFeatureFlags() {
  // Global feature flags apply to all organizations (organizationId = null)
  const desired = [
    { key: 'team_scoping', isEnabled: true, description: 'Enable team-based data scoping (read)' }
  ];

  for (const flag of desired) {
    const existing = await prisma.featureFlag.findFirst({
      where: { key: flag.key, organizationId: null },
      select: { id: true }
    });

    if (!existing) {
      await prisma.featureFlag.create({
        data: {
          key: flag.key,
          isEnabled: flag.isEnabled,
          description: flag.description,
          organizationId: null
        }
      });
      // eslint-disable-next-line no-console
      console.log(`✅ [bootstrap] Created global feature flag: ${flag.key}=${flag.isEnabled}`);
    }
  }
}

async function ensureDefaultTeamForOrg(organizationId) {
  const existing = await prisma.team.findFirst({
    where: { organizationId, name: DEFAULT_TEAM_NAME },
    select: { id: true }
  });
  if (existing) return existing.id;

  const created = await prisma.team.create({
    data: {
      organizationId,
      name: DEFAULT_TEAM_NAME,
      description: DEFAULT_TEAM_DESCRIPTION,
      isActive: true
    },
    select: { id: true }
  });
  return created.id;
}

async function ensureMembershipsInTeam(organizationId, teamId) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId, isActive: true },
    select: { id: true }
  });

  if (memberships.length === 0) return 0;

  const result = await prisma.teamMembership.createMany({
    data: memberships.map((m) => ({
      teamId,
      membershipId: m.id,
      roleCode: null
    })),
    skipDuplicates: true
  });

  return result.count || 0;
}

async function backfillTeamIdForOrg(organizationId, teamId) {
  // Assign default team to legacy org-wide rows (teamId = null)
  const updates = await Promise.all([
    prisma.objective.updateMany({
      where: { organizationId, teamId: null },
      data: { teamId }
    }),
    prisma.rock.updateMany({
      where: { organizationId, teamId: null },
      data: { teamId }
    }),
    prisma.story.updateMany({
      where: { organizationId, teamId: null },
      data: { teamId }
    }),
    prisma.task.updateMany({
      where: { organizationId, teamId: null },
      data: { teamId }
    }),
    prisma.sprint.updateMany({
      where: { organizationId, teamId: null },
      data: { teamId }
    })
  ]);

  return {
    objectives: updates[0].count || 0,
    rocks: updates[1].count || 0,
    stories: updates[2].count || 0,
    tasks: updates[3].count || 0,
    sprints: updates[4].count || 0
  };
}

async function ensureDefaultTeamsAndBackfill() {
  // For every organization:
  // 1) Ensure the Default team exists
  // 2) Backfill all teamId=null entities to Default team
  // 3) Add all active memberships to Default team
  // This is guarded per-org via SystemSetting so it runs once per org.

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  for (const org of orgs) {
    const key = backfillKeyForOrg(org.id);

    const already = await prisma.systemSetting.findUnique({
      where: { key },
      select: { key: true }
    });

    if (already) continue;

    const teamId = await ensureDefaultTeamForOrg(org.id);
    const updatedCounts = await backfillTeamIdForOrg(org.id, teamId);
    const membershipAdded = await ensureMembershipsInTeam(org.id, teamId);

    await prisma.systemSetting.create({
      data: {
        key,
        value: {
          organizationId: org.id,
          teamId,
          updatedCounts,
          membershipAdded,
          completedAt: new Date().toISOString()
        },
        description: 'Backfill: assign default team + memberships (RBAC v2)'
      }
    });

    // eslint-disable-next-line no-console
    console.log(`✅ [bootstrap] Default team backfill done for org=${org.id}`, {
      teamId,
      updatedCounts,
      membershipAdded
    });
  }
}

async function bootstrap() {
  try {
    await ensureGlobalFeatureFlags();
    await ensureDefaultTeamsAndBackfill();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('⚠️ [bootstrap] Failed:', err);
  }
}

module.exports = {
  bootstrap
};


