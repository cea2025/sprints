const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgId = 'cec8c2ea-301c-4931-8968-9469b95b97e1';
  const teamMemberId = '9d00f83e-a3f6-4df5-a89f-dd087c6e81b0';
  
  // Count stories
  const totalStories = await prisma.story.count({ where: { organizationId: orgId } });
  const userStories = await prisma.story.count({ where: { organizationId: orgId, ownerId: teamMemberId } });
  const incompleteUserStories = await prisma.story.count({ 
    where: { organizationId: orgId, ownerId: teamMemberId, progress: { lt: 100 } } 
  });
  
  // Get user stories details
  const userStoriesData = await prisma.story.findMany({
    where: { organizationId: orgId, ownerId: teamMemberId, progress: { lt: 100 } },
    select: { id: true, title: true, progress: true, ownerId: true }
  });
  
  // Count tasks
  const totalTasks = await prisma.task.count({ where: { organizationId: orgId } });
  const userTasks = await prisma.task.count({ where: { organizationId: orgId, ownerId: teamMemberId } });
  const incompleteTasks = await prisma.task.count({
    where: { organizationId: orgId, ownerId: teamMemberId, status: { not: 'DONE' } }
  });
  
  // Get user tasks details
  const userTasksData = await prisma.task.findMany({
    where: { organizationId: orgId, ownerId: teamMemberId, status: { not: 'DONE' } },
    select: { id: true, title: true, status: true, ownerId: true }
  });
  
  console.log('=== Stories (Milestones) ===');
  console.log('Total in org:', totalStories);
  console.log('User owned:', userStories);
  console.log('User incomplete:', incompleteUserStories);
  console.log('User incomplete details:');
  userStoriesData.forEach(s => console.log(`  - ${s.title} (progress: ${s.progress}%)`));
  
  console.log('\n=== Tasks ===');
  console.log('Total in org:', totalTasks);
  console.log('User owned:', userTasks);
  console.log('User incomplete:', incompleteTasks);
  console.log('User incomplete details:');
  userTasksData.forEach(t => console.log(`  - ${t.title} (status: ${t.status})`));
  
  await prisma.$disconnect();
}
check();

