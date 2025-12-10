const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgId = 'cec8c2ea-301c-4931-8968-9469b95b97e1';
  const teamMemberId = '9d00f83e-a3f6-4df5-a89f-dd087c6e81b0';
  
  // Get the story owned by user
  const stories = await prisma.story.findMany({
    where: { ownerId: teamMemberId },
    include: { sprint: true }
  });
  
  console.log('Stories owned by user:');
  stories.forEach(s => {
    console.log(`  - "${s.title}" | sprintId: ${s.sprintId || 'NULL'} | sprint: ${s.sprint?.name || 'NONE'}`);
  });
  
  // Get current sprint from org settings
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true }
  });
  console.log('\nOrg settings currentSprintId:', org?.settings?.currentSprintId || 'NOT SET');
  
  // Get most recent sprint
  const recentSprint = await prisma.sprint.findFirst({
    where: { organizationId: orgId },
    orderBy: { startDate: 'desc' }
  });
  console.log('Most recent sprint:', recentSprint?.name, '| id:', recentSprint?.id);
  
  // Get tasks owned by user
  const tasks = await prisma.task.findMany({
    where: { ownerId: teamMemberId },
    select: { id: true, title: true, status: true }
  });
  console.log('\nTasks owned by user:');
  tasks.forEach(t => {
    console.log(`  - "${t.title}" | status: ${t.status}`);
  });
  
  await prisma.$disconnect();
}
check();

