const { ROLES, isRoleAtLeast } = require('../constants/roles');
const { isEnabled } = require('../services/featureFlags');

/**
 * Apply team-based read scoping to a Prisma `where` clause.
 *
 * Behavior:
 * - Only applies when feature flag `team_scoping` is enabled for the org.
 * - ADMIN / MANAGER (and Super Admin) can see everything.
 * - MEMBER / VIEWER are scoped to:
 *    - teamId in principal.teamIds
 *
 * NOTE: With team scoping enabled, `teamId = null` is treated as org-wide/legacy and is
 * visible only to MANAGER+ (per product requirement).
 */
function applyTeamReadScope(where, req, options = {}) {
  // options kept for future flexibility; current policy is strict:
  // non-managers NEVER see teamId = null when scoping is enabled.
  const { allowNullTeam = false } = options;

  const principal = req?.principal;
  if (!principal) return where;

  if (principal.isSuperAdmin) return where;
  if (!isEnabled(principal.featureFlags, 'team_scoping')) return where;
  if (isRoleAtLeast(principal.role || ROLES.VIEWER, ROLES.MANAGER)) return where;

  const teamIds = Array.isArray(principal.teamIds) ? principal.teamIds : [];

  const scopeFilter = teamIds.length > 0
    ? (allowNullTeam
      ? { OR: [{ teamId: { in: teamIds } }, { teamId: null }] }
      : { teamId: { in: teamIds } })
    : { teamId: { in: [] } };

  // Merge safely using AND
  if (!where || Object.keys(where).length === 0) return scopeFilter;

  return { AND: [where, scopeFilter] };
}

module.exports = {
  applyTeamReadScope
};


