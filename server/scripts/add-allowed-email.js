// Script to add existing users to allowed emails list
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all existing users
  const users = await prisma.user.findMany();
  
  console.log('Existing users:');
  for (const user of users) {
    console.log(`  - ${user.email} (${user.role})`);
    
    // Check if already in allowed list
    const existing = await prisma.allowedEmail.findUnique({
      where: { email: user.email }
    });
    
    if (!existing) {
      // Add to allowed list
      await prisma.allowedEmail.create({
        data: {
          email: user.email,
          name: user.name,
          role: user.role,
          note: 'Auto-added from existing user'
        }
      });
      console.log(`    ✅ Added to allowed list`);
    } else {
      console.log(`    ⏭️  Already in allowed list`);
    }
  }
  
  // Show all allowed emails
  const allowedEmails = await prisma.allowedEmail.findMany();
  console.log('\nAll allowed emails:');
  allowedEmails.forEach(ae => console.log(`  - ${ae.email} (${ae.role})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

