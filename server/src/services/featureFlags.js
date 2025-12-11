const prisma = require('../lib/prisma');

/**
 * Feature Flags service
 *
 * Supports:
 * - Global flags (organizationId = null)
 * - Organization overrides (organizationId = <org>)
 *
 * Returns a map: { [key]: { key, isEnabled } }
 */

async function getFeatureFlagsMap(organizationId) {
  if (!organizationId) return {};

  const flags = await prisma.featureFlag.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId }]
    },
    select: { key: true, isEnabled: true, organizationId: true }
  });

  // Org-specific overrides global
  const result = {};
  for (const f of flags) {
    if (!result[f.key]) {
      result[f.key] = { key: f.key, isEnabled: f.isEnabled };
      continue;
    }

    // Prefer org-specific row over global (null org)
    if (f.organizationId === organizationId) {
      result[f.key] = { key: f.key, isEnabled: f.isEnabled };
    }
  }

  return result;
}

function isEnabled(featureFlagsMap, key) {
  return featureFlagsMap?.[key]?.isEnabled === true;
}

module.exports = {
  getFeatureFlagsMap,
  isEnabled
};


