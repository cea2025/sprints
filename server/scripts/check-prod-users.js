const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get user
  const user = await prisma.user.findFirst({ where: { email: 'a0504105090@gmail.com' } });
  console.log('User ID:', user?.id);
  
  // Get team members in org
  const teamMembers = await prisma.teamMember.findMany({
    where: { organizationId: 'cec8c2ea-301c-4931-8968-9469b95b97e1' },
    select: { id: true, name: true, userId: true }
  });
  console.log('TeamMembers:');
  teamMembers.forEach(tm => {
    console.log(`  - ${tm.name}: userId=${tm.userId || 'NULL'}`);
  });
  
  // Check if user has teamMember
  if (user) {
    const linkedTm = teamMembers.find(tm => tm.userId === user.id);
    if (linkedTm) {
      console.log('\n✅ User is linked to TeamMember:', linkedTm.name);
    } else {
      console.log('\n❌ User is NOT linked to any TeamMember!');
      console.log('\nTo fix, run:');
      console.log(`UPDATE "TeamMember" SET "userId" = '${user.id}' WHERE id = '<TEAM_MEMBER_ID>';`);
    }
  }
  
  await prisma.$disconnect();
}
check();

