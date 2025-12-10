const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const email = 'cea@glb.org.il';
  const orgId = 'cec8c2ea-301c-4931-8968-9469b95b97e1'; // הגמח המרכזי
  
  // Find user
  const user = await prisma.user.findFirst({ 
    where: { email },
    include: { teamMembers: true }
  });
  
  if (!user) {
    console.log('❌ User not found:', email);
    return;
  }
  
  console.log('✅ User found:', user.id, user.email, user.name);
  console.log('   teamMembers:', user.teamMembers.length);
  
  user.teamMembers.forEach(tm => {
    console.log(`   - ${tm.name} | orgId: ${tm.organizationId} | id: ${tm.id}`);
  });
  
  // Check if linked to org's teamMember
  const tmInOrg = user.teamMembers.find(tm => tm.organizationId === orgId);
  if (tmInOrg) {
    console.log('\n✅ User has teamMember in הגמח המרכזי:', tmInOrg.id);
  } else {
    console.log('\n❌ User has NO teamMember in הגמח המרכזי!');
    
    // Find potential teamMember to link
    const teamMembers = await prisma.teamMember.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, userId: true }
    });
    
    console.log('\nTeamMembers in org:');
    teamMembers.forEach(tm => {
      console.log(`   - ${tm.name} | userId: ${tm.userId || 'NULL'}`);
    });
  }
  
  await prisma.$disconnect();
}
check();

