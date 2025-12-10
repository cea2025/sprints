const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const userId = '3eaf37a3-c5eb-44ab-a803-7844770d8782'; // cea@glb.org.il
  const orgId = 'cec8c2ea-301c-4931-8968-9469b95b97e1'; // הגמח המרכזי
  
  // Find the unlinked TeamMember "חיים אלעזר אלתר"
  const teamMember = await prisma.teamMember.findFirst({
    where: { 
      organizationId: orgId,
      name: { contains: 'חיים אלעזר' },
      userId: null // Only the unlinked one
    }
  });
  
  if (!teamMember) {
    console.log('❌ No unlinked TeamMember found');
    return;
  }
  
  console.log('Found TeamMember:', teamMember.id, teamMember.name);
  
  // Link it to the user
  await prisma.teamMember.update({
    where: { id: teamMember.id },
    data: { userId: userId }
  });
  
  console.log('✅ Linked TeamMember to cea@glb.org.il');
  
  await prisma.$disconnect();
}
fix();

