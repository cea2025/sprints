const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const userId = '93130935-d93b-4581-bde5-1fe51cadc1e2';
  const orgId = 'cec8c2ea-301c-4931-8968-9469b95b97e1';
  
  // Find the team member to link (חיים אלעזר אלתר)
  const teamMember = await prisma.teamMember.findFirst({
    where: { 
      organizationId: orgId,
      name: { contains: 'חיים אלעזר' }
    }
  });
  
  if (!teamMember) {
    console.log('❌ TeamMember not found');
    return;
  }
  
  console.log('Found TeamMember:', teamMember.id, teamMember.name);
  
  // Update the link
  await prisma.teamMember.update({
    where: { id: teamMember.id },
    data: { userId: userId }
  });
  
  console.log('✅ Updated! TeamMember now linked to user');
  
  await prisma.$disconnect();
}
fix();

