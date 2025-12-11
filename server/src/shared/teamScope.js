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
 *    - and optionally teamId = null (legacy / org-wide items)
 *
 * This is intentionally conservative to avoid breaking existing data while we migrate.
 */
function applyTeamReadScope(where, req, options = {}) {
  const { allowNullTeam = true } = options;

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
    : (allowNullTeam ? { teamId: null } : { teamId: { in: [] } });

  // Merge safely using AND
  if (!where || Object.keys(where).length === 0) return scopeFilter;

  return { AND: [where, scopeFilter] };
}

module.exports = {
  applyTeamReadScope
};


