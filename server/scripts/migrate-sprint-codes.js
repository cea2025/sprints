/**
 * Migration Script: Sprint name → sp-XX
 *
 * What it does:
 * - For each organization, orders sprints by startDate (then createdAt)
 * - Renames them to sp-01, sp-02, ...
 * - Preserves the old (legacy) long name in Sprint.legacyName (only if legacyName is empty and the old name is NOT already sp-XX)
 *
 * Run:
 *   node scripts/migrate-sprint-codes.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function isValidSpCode(name) {
  return typeof name === 'string' && /^sp-\d+$/i.test(name.trim());
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

async function migrateOrg(orgId, orgName) {
  const sprints = await prisma.sprint.findMany({
    where: { organizationId: orgId },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, legacyName: true }
  });

  if (sprints.length === 0) {
    console.log(`\n🏢 ${orgName}: no sprints`);
    return;
  }

  console.log(`\n🏢 ${orgName}: ${sprints.length} sprints`);

  // Phase 1: move to unique temp names to avoid collisions on @@unique([organizationId, name])
  await prisma.$transaction(
    sprints.map((s) =>
      prisma.sprint.update({
        where: { id: s.id },
        data: {
          name: `tmp-sp-${s.id.slice(0, 8)}`,
          legacyName: s.legacyName ?? (!isValidSpCode(s.name) ? s.name : undefined)
        }
      })
    )
  );

  // Phase 2: assign final sp-XX names
  await prisma.$transaction(
    sprints.map((s, idx) =>
      prisma.sprint.update({
        where: { id: s.id },
        data: { name: `sp-${pad2(idx + 1)}` }
      })
    )
  );

  console.log(`   ✅ Renamed to sp-01..sp-${pad2(sprints.length)}`);
}

async function main() {
  console.log('🚀 Starting sprint code migration (name → sp-XX)\n');

  try {
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    console.log(`Found ${organizations.length} organizations`);

    for (const org of organizations) {
      // eslint-disable-next-line no-await-in-loop
      await migrateOrg(org.id, org.name);
    }

    console.log('\n✨ Done');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();


