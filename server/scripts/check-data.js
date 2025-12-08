const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Checking database...\n');
  
  const orgs = await prisma.organization.findMany();
  console.log(`Organizations: ${orgs.length}`);
  orgs.forEach(o => console.log(`  - ${o.name} (${o.slug})`));
  
  const rocks = await prisma.rock.findMany({ include: { organization: true } });
  console.log(`\nRocks: ${rocks.length}`);
  rocks.slice(0, 5).forEach(r => console.log(`  - ${r.code}: ${r.name} [orgId: ${r.organizationId}]`));
  
  const stories = await prisma.story.findMany({ include: { organization: true } });
  console.log(`\nStories: ${stories.length}`);
  stories.slice(0, 5).forEach(s => console.log(`  - ${s.title} [orgId: ${s.organizationId}]`));
  
  const sprints = await prisma.sprint.findMany({ include: { organization: true } });
  console.log(`\nSprints: ${sprints.length}`);
  sprints.slice(0, 5).forEach(s => console.log(`  - ${s.name} [orgId: ${s.organizationId}]`));
  
  const team = await prisma.teamMember.findMany();
  console.log(`\nTeam Members: ${team.length}`);
  team.slice(0, 5).forEach(t => console.log(`  - ${t.name} [orgId: ${t.organizationId}]`));
  
  await prisma.$disconnect();
}

checkData().catch(console.error);

