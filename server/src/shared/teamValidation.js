const prisma = require('../lib/prisma');

async function validateTeamId(organizationId, teamId) {
  if (!teamId) return null;
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId, isActive: true },
    select: { id: true }
  });
  return team ? team.id : null;
}

function getDefaultTeamIdFromPrincipal(req) {
  const teamIds = req?.principal?.teamIds;
  if (Array.isArray(teamIds) && teamIds.length > 0) return teamIds[0];
  return null;
}

module.exports = {
  validateTeamId,
  getDefaultTeamIdFromPrincipal
};


