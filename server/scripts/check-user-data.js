const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const userId = '93130935-d93b-4581-bde5-1fe51cadc1e2';
  const orgId = 'cec8c2ea-301c-4931-8968-9469b95b97e1';
  
  // Check teamMembers for this user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teamMembers: true }
  });
  
  console.log('User teamMembers:');
  user.teamMembers.forEach(tm => {
    console.log('  -', tm.name, '| orgId:', tm.organizationId, '| id:', tm.id);
  });
  
  // Check if there are milestones owned by this teamMember
  const teamMember = user.teamMembers.find(tm => tm.organizationId === orgId);
  if (teamMember) {
    console.log('\nTeamMember for הגמח המרכזי:', teamMember.id);
    
    const stories = await prisma.story.findMany({
      where: { ownerId: teamMember.id },
      select: { id: true, title: true }
    });
    console.log('Owned stories (milestones):', stories.length);
    stories.forEach(s => console.log('  -', s.title));
    
    const tasks = await prisma.task.findMany({
      where: { ownerId: teamMember.id },
      select: { id: true, title: true, status: true }
    });
    console.log('\nOwned tasks:', tasks.length);
    tasks.forEach(t => console.log('  -', t.title, '|', t.status));
    
    // Check ALL stories in org
    const allStories = await prisma.story.findMany({
      where: { organizationId: orgId },
      take: 10,
      include: { owner: { select: { name: true } } }
    });
    console.log('\nAll stories in org (first 10):');
    allStories.forEach(s => console.log('  -', s.title, '| owner:', s.owner?.name || 'none'));
  } else {
    console.log('No teamMember found for org:', orgId);
  }
  
  await prisma.$disconnect();
}
check();

