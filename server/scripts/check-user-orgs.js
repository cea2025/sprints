const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserOrgs() {
  console.log('🔍 Checking user organizations...\n');
  
  // Get all users
  const users = await prisma.user.findMany({
    include: {
      organizations: {
        include: {
          organization: true
        }
      }
    }
  });
  
  console.log(`Users: ${users.length}`);
  for (const user of users) {
    console.log(`\n👤 ${user.name} (${user.email})`);
    console.log(`   isSuperAdmin: ${user.isSuperAdmin}`);
    console.log(`   Organizations: ${user.organizations.length}`);
    for (const m of user.organizations) {
      console.log(`     - ${m.organization.name} (${m.organization.slug}) as ${m.role}`);
    }
  }
  
  // Get all organizations
  const orgs = await prisma.organization.findMany({
    include: {
      members: {
        include: { user: true }
      }
    }
  });
  
  console.log('\n\n📁 Organization Members:');
  for (const org of orgs) {
    console.log(`\n${org.name} (${org.id}):`);
    for (const m of org.members) {
      console.log(`  - ${m.user.email} (${m.role})`);
    }
    if (org.members.length === 0) {
      console.log('  (no members)');
    }
  }
  
  await prisma.$disconnect();
}

checkUserOrgs().catch(console.error);

