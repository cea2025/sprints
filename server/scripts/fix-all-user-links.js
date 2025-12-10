const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllLinks() {
  console.log('🔍 Checking all TeamMember-User links...\n');
  
  // Get the main user
  const user = await prisma.user.findFirst({ 
    where: { email: 'a0504105090@gmail.com' } 
  });
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('User:', user.email, '- ID:', user.id);
  
  // Get all organizations
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true }
  });
  
  for (const org of orgs) {
    console.log(`\n📁 Organization: ${org.name}`);
    console.log('='.repeat(40));
    
    // Find team member named "חיים אלעזר" in this org
    const teamMember = await prisma.teamMember.findFirst({
      where: { 
        organizationId: org.id,
        name: { contains: 'חיים אלעזר' }
      }
    });
    
    if (teamMember) {
      if (teamMember.userId === user.id) {
        console.log(`✅ ${teamMember.name} - already linked`);
      } else {
        // Link it
        await prisma.teamMember.update({
          where: { id: teamMember.id },
          data: { userId: user.id }
        });
        console.log(`🔗 ${teamMember.name} - NOW LINKED`);
      }
    } else {
      console.log('⚠️ No "חיים אלעזר" found in this org');
    }
  }
  
  console.log('\n✨ Done!');
  await prisma.$disconnect();
}

fixAllLinks();

