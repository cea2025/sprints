/**
 * Seed Team Members Script
 * Run with: node scripts/seed-team.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const teamMembers = [
  { name: 'יוסי כהן', role: 'מפתח', capacity: 20 },
  { name: 'מירי לוי', role: 'אנליסטית', capacity: 15 },
  { name: 'דני שמש', role: 'מנהל מוצר', capacity: 10 },
  { name: 'רחל גולן', role: 'מפתחת', capacity: 20 },
  { name: 'אבי מזרחי', role: 'בודק', capacity: 15 },
  { name: 'שירה כץ', role: 'מעצבת', capacity: 12 }
];

async function main() {
  console.log('👥 Adding team members...\n');

  for (const member of teamMembers) {
    try {
      // Check if member with same name exists
      const existing = await prisma.teamMember.findFirst({
        where: { name: member.name }
      });

      if (existing) {
        await prisma.teamMember.update({
          where: { id: existing.id },
          data: { role: member.role, capacity: member.capacity, isActive: true }
        });
        console.log(`🔄 Updated: ${member.name} (${member.role})`);
      } else {
        await prisma.teamMember.create({
          data: member
        });
        console.log(`✅ Created: ${member.name} (${member.role})`);
      }
    } catch (error) {
      console.error(`❌ Error with ${member.name}:`, error.message);
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

