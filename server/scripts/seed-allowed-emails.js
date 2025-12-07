/**
 * Seed Allowed Emails Script
 * Run with: node scripts/seed-allowed-emails.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const emails = [
  { email: 'a0504105090@gmail.com', role: 'ADMIN' },
  { email: 'cea@glb.org.il', role: 'MANAGER' },
  { email: 'db@glb.org.il', role: 'MANAGER' },
  { email: 'dm@glb.org.il', role: 'MANAGER' },
  { email: 'ep@glb.org.il', role: 'MANAGER' },
  { email: 'il@glb.org.il', role: 'MANAGER' },
  { email: 'l@glb.org.il', role: 'MANAGER' },
  { email: 'meirr@glb.org.il', role: 'MANAGER' },
  { email: 'ruc@glb.org.il', role: 'MANAGER' },
  { email: 'tz@glb.org.il', role: 'MANAGER' }
];

async function main() {
  console.log('📧 Adding allowed emails...\n');

  for (const item of emails) {
    try {
      const result = await prisma.allowedEmail.upsert({
        where: { email: item.email },
        update: { role: item.role },
        create: {
          email: item.email,
          role: item.role
        }
      });
      console.log(`✅ ${result.email} (${result.role})`);
    } catch (error) {
      console.error(`❌ Error adding ${item.email}:`, error.message);
    }
  }

  console.log('\n🎉 Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

