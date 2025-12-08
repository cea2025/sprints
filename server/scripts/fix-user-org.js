const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserOrg() {
  console.log('🔧 Fixing user organization setup...\n');
  
  const userEmail = 'a0504105090@gmail.com';
  const correctOrgId = 'cec8c2ea-301c-4931-8968-9469b95b97e1'; // הגמח המרכזי with all data
  
  // 1. Set user as Super Admin
  const user = await prisma.user.update({
    where: { email: userEmail },
    data: { isSuperAdmin: true }
  });
  console.log(`✅ ${user.name} (${user.email}) is now Super Admin`);
  
  // 2. Delete the empty organization
  const emptyOrg = await prisma.organization.findFirst({
    where: { 
      slug: 'gemach',
      id: { not: correctOrgId }
    },
    include: {
      _count: {
        select: { rocks: true, stories: true, sprints: true }
      }
    }
  });
  
  if (emptyOrg && emptyOrg._count.rocks === 0 && emptyOrg._count.stories === 0) {
    console.log(`\n🗑️ Found empty organization: ${emptyOrg.name} (${emptyOrg.id})`);
    console.log(`   Rocks: ${emptyOrg._count.rocks}, Stories: ${emptyOrg._count.stories}, Sprints: ${emptyOrg._count.sprints}`);
    
    // Delete memberships first
    await prisma.organizationMember.deleteMany({
      where: { organizationId: emptyOrg.id }
    });
    
    // Delete the empty organization
    await prisma.organization.delete({
      where: { id: emptyOrg.id }
    });
    
    console.log('   ✅ Empty organization deleted');
  }
  
  // 3. Verify correct organization
  const correctOrg = await prisma.organization.findUnique({
    where: { id: correctOrgId },
    include: {
      _count: {
        select: { rocks: true, stories: true, sprints: true, members: true }
      }
    }
  });
  
  console.log(`\n📁 Correct organization: ${correctOrg.name}`);
  console.log(`   Slug: ${correctOrg.slug}`);
  console.log(`   Rocks: ${correctOrg._count.rocks}`);
  console.log(`   Stories: ${correctOrg._count.stories}`);
  console.log(`   Sprints: ${correctOrg._count.sprints}`);
  console.log(`   Members: ${correctOrg._count.members}`);
  
  console.log('\n✅ Done! Now login and navigate to:');
  console.log(`   https://sprints.onrender.com/${correctOrg.slug}/dashboard`);
  
  await prisma.$disconnect();
}

fixUserOrg().catch(console.error);

