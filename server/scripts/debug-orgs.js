/**
 * Debug script to check organization data isolation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('🔍 Debugging organization data isolation...\n');

  // 1. List all organizations
  console.log('📋 Organizations:');
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.table(orgs);

  // 2. Count data per organization
  console.log('\n📊 Data count per organization:');
  
  for (const org of orgs) {
    console.log(`\n--- ${org.name} (${org.slug}) ---`);
    console.log(`   ID: ${org.id}`);
    
    const rocks = await prisma.rock.count({ where: { organizationId: org.id } });
    const sprints = await prisma.sprint.count({ where: { organizationId: org.id } });
    const stories = await prisma.story.count({ where: { organizationId: org.id } });
    const objectives = await prisma.objective.count({ where: { organizationId: org.id } });
    const team = await prisma.teamMember.count({ where: { organizationId: org.id } });
    
    console.log(`   Rocks: ${rocks}`);
    console.log(`   Sprints: ${sprints}`);
    console.log(`   Stories: ${stories}`);
    console.log(`   Objectives: ${objectives}`);
    console.log(`   Team Members: ${team}`);
  }

  // 3. Check if there's orphan data (no organizationId)
  console.log('\n⚠️ Checking for orphan data (null organizationId):');
  const orphanRocks = await prisma.rock.count({ where: { organizationId: null } });
  const orphanSprints = await prisma.sprint.count({ where: { organizationId: null } });
  const orphanStories = await prisma.story.count({ where: { organizationId: null } });
  
  console.log(`   Orphan Rocks: ${orphanRocks}`);
  console.log(`   Orphan Sprints: ${orphanSprints}`);
  console.log(`   Orphan Stories: ${orphanStories}`);

  // 4. Check organization members
  console.log('\n👥 Organization Members:');
  const members = await prisma.organizationMember.findMany({
    include: {
      user: { select: { email: true, name: true } },
      organization: { select: { name: true, slug: true } }
    }
  });
  
  for (const m of members) {
    console.log(`   ${m.user.email} -> ${m.organization.name} (${m.organization.slug}) as ${m.role}`);
  }

  await prisma.$disconnect();
}

debug().catch(console.error);

