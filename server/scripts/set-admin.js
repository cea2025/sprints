// Script to set first user as ADMIN
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all users
  const users = await prisma.user.findMany();
  console.log('Current users:');
  users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
  
  if (users.length > 0) {
    // Update first user to ADMIN
    const updated = await prisma.user.update({
      where: { id: users[0].id },
      data: { role: 'ADMIN' }
    });
    console.log(`\n✅ Updated ${updated.email} to ADMIN`);
  } else {
    console.log('\n❌ No users found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

