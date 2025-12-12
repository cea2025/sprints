const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'a0504105090@gmail.com';
  
  // Add to SuperAdminEmail table
  await prisma.superAdminEmail.upsert({
    where: { email },
    create: { email, note: 'Local dev admin', isActive: true },
    update: { isActive: true }
  });
  console.log('✅ Added to SuperAdminEmail table');
  
  // Update user if exists
  const user = await prisma.user.findFirst({ where: { email } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: true }
    });
    console.log('✅ Updated user to Super Admin');
  } else {
    console.log('ℹ️ User will be created as Super Admin on next login');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

