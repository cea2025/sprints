const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  // Get gmach org
  const org = await prisma.organization.findFirst({ where: { slug: 'gmach' } });
  console.log('Org:', org?.name, org?.id);
  
  // Count stories
  const totalStories = await prisma.story.count({ where: { organizationId: org.id } });
  const incompleteStories = await prisma.story.count({ 
    where: { organizationId: org.id, progress: { lt: 100 } } 
  });
  const completeStories = await prisma.story.count({ 
    where: { organizationId: org.id, progress: 100 } 
  });
  
  console.log('\n=== STORIES ===');
  console.log('Total:', totalStories);
  console.log('Incomplete (progress < 100):', incompleteStories);
  console.log('Complete (progress = 100):', completeStories);
  
  // List all stories with progress
  const stories = await prisma.story.findMany({
    where: { organizationId: org.id },
    select: { title: true, progress: true, ownerId: true, membershipId: true }
  });
  console.log('\nAll stories:');
  stories.forEach(s => console.log(' -', s.title, ':', s.progress + '%', 'owner:', s.ownerId || s.membershipId || 'NONE'));

  // Count tasks
  const totalTasks = await prisma.task.count({ where: { organizationId: org.id } });
  const activeTasks = await prisma.task.count({ 
    where: { organizationId: org.id, status: { not: 'CANCELLED' } } 
  });
  console.log('\n=== TASKS ===');
  console.log('Total:', totalTasks);
  console.log('Active (not cancelled):', activeTasks);
  
  const tasks = await prisma.task.findMany({
    where: { organizationId: org.id },
    select: { title: true, status: true, ownerId: true, membershipId: true }
  });
  console.log('\nAll tasks:');
  tasks.forEach(t => console.log(' -', t.title, ':', t.status, 'owner:', t.ownerId || t.membershipId || 'NONE'));
  
  await prisma.$disconnect();
}

debug().catch(console.error);

