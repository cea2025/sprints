/**
 * Seed Objectives Script
 * Run with: node scripts/seed-objectives.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const objectives = [
  {
    code: '25-OBJ-01',
    name: 'חוברת ואתר הסבר תוכניות הגמ"ח',
    description: 'לא פירמידה - הסברה ושיווק תוכניות הגמ"ח',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-02',
    name: 'יח"צ של הגמ"ח',
    description: 'יחסי ציבור ופרסום הגמ"ח',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-03',
    name: 'התקדמות תוכנה חדשה',
    description: 'הגדרה ופיתוח תוכנה חדשה',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-04',
    name: 'הטמעה והפצה איזור אישי / פרסום',
    description: 'הטמעת האיזור האישי והפצתו למשתמשים',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-05',
    name: 'חוו"ד משפטים',
    description: 'קבלת חוות דעת משפטית',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-06',
    name: 'תוכנית שימור',
    description: 'תוכנית לשימור לקוחות ומשתתפים',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-07',
    name: 'המלצות רבנים',
    description: 'קבלת המלצות מרבנים',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-08',
    name: 'הרחבת ועדת כספים',
    description: '2 חוד כספים / הרחבת ועדת כספים',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-09',
    name: 'דיון קבלת חווד נוסף',
    description: 'דיון האם לקבל עוד חווד / לסגור עם בלס',
    timeframe: '2025'
  },
  {
    code: '25-OBJ-10',
    name: 'קביעת לוח דוח כספי',
    description: 'קביעת לוח לדוח כספי ואיזה שינויים / הוספות ביאורים נכניס',
    timeframe: '2025'
  }
];

async function main() {
  console.log('🌱 Starting to seed objectives...\n');

  for (const obj of objectives) {
    try {
      const created = await prisma.objective.upsert({
        where: { code: obj.code },
        update: {
          name: obj.name,
          description: obj.description,
          timeframe: obj.timeframe
        },
        create: obj
      });
      console.log(`✅ ${created.code}: ${created.name}`);
    } catch (error) {
      console.error(`❌ Error creating ${obj.code}:`, error.message);
    }
  }

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

