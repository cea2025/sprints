const prisma = require('../lib/prisma');

/**
 * Bootstrap tasks executed on server start.
 * Must be idempotent and safe (never throws to crash the server).
 */

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

async function bootstrap() {
  try {
    await ensureGlobalFeatureFlags();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('⚠️ [bootstrap] Failed:', err);
  }
}

module.exports = {
  bootstrap
};


