/**
 * Migration Script: Task codes sequential (m-01, m-02, ...)
 *
 * Requirement:
 * - Oldest task (by createdAt, then id) becomes <prefix>-01, then <prefix>-02, ...
 * - Per organization
 *
 * Run:
 *   node scripts/migrate-task-codes-sequential.js
 *
 * Notes:
 * - Prefix is fixed to "m" for tasks.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function pad2(n) {
  return String(n).padStart(2, '0');
}

async function migrateOrg(orgId, orgName) {
  const p = 'm';

  const tasks = await prisma.task.findMany({
    where: { organizationId: orgId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, code: true, title: true }
  });

  console.log(`\n🏢 ${orgName}: ${tasks.length} tasks`);
  if (tasks.length === 0) return;

  // Phase 1: temporary codes to avoid collisions during updates
  await prisma.$transaction(
    tasks.map((t) =>
      prisma.task.update({
        where: { id: t.id },
        data: { code: `tmp-${p}-${t.id}` }
      })
    )
  );

  // Phase 2: final sequential codes
  await prisma.$transaction(
    tasks.map((t, idx) =>
      prisma.task.update({
        where: { id: t.id },
        data: { code: `${p}-${pad2(idx + 1)}` }
      })
    )
  );

  console.log(`   ✅ Renumbered: ${p}-01..${p}-${pad2(tasks.length)}`);
}

async function main() {
  console.log('🚀 Starting task code migration (sequential m-XX)\n');

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


