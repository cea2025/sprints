const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create team members
  const teamMembers = await Promise.all([
    prisma.teamMember.create({
      data: {
        name: 'יוסי כהן',
        role: 'מפתח',
        capacity: 20
      }
    }),
    prisma.teamMember.create({
      data: {
        name: 'מירי לוי',
        role: 'אנליסטית',
        capacity: 15
      }
    }),
    prisma.teamMember.create({
      data: {
        name: 'דני שמש',
        role: 'מנהל מוצר',
        capacity: 10
      }
    })
  ]);

  console.log(`✅ Created ${teamMembers.length} team members`);

  // Create rocks for current quarter
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const rocks = await Promise.all([
    prisma.rock.create({
      data: {
        code: `${currentYear.toString().slice(-2)}-Q${currentQuarter}-1`,
        name: 'השקת מערכת CRM חדשה',
        description: 'מעבר למערכת CRM חדשה כולל הטמעה והדרכה',
        year: currentYear,
        quarter: currentQuarter,
        status: 'IN_PROGRESS',
        ownerId: teamMembers[2].id
      }
    }),
    prisma.rock.create({
      data: {
        code: `${currentYear.toString().slice(-2)}-Q${currentQuarter}-2`,
        name: 'שיפור ביצועי המערכת',
        description: 'הפחתת זמני תגובה ב-50%',
        year: currentYear,
        quarter: currentQuarter,
        status: 'PLANNED',
        ownerId: teamMembers[0].id
      }
    }),
    prisma.rock.create({
      data: {
        code: `${currentYear.toString().slice(-2)}-Q${currentQuarter}-3`,
        name: 'בניית דשבורד אנליטיקה',
        description: 'פיתוח דשבורד BI לניתוח נתונים',
        year: currentYear,
        quarter: currentQuarter,
        status: 'PLANNED',
        ownerId: teamMembers[1].id
      }
    })
  ]);

  console.log(`✅ Created ${rocks.length} rocks`);

  // Create a sprint
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 13); // 2 week sprint

  const sprint = await prisma.sprint.create({
    data: {
      name: `${currentYear.toString().slice(-2)}-Q${currentQuarter}-S1`,
      goal: 'התחלת פיתוח מודול CRM',
      startDate: startOfWeek,
      endDate: endOfWeek,
      mainRockId: rocks[0].id
    }
  });

  console.log(`✅ Created sprint: ${sprint.name}`);

  // Create stories
  const stories = await Promise.all([
    // Stories for Rock 1 (CRM)
    prisma.story.create({
      data: {
        title: 'תכנון ארכיטקטורת המערכת',
        description: 'הכנת מסמך ארכיטקטורה ותכנון טכני',
        status: 'DONE',
        priority: 'HIGH',
        estimate: 5,
        rockId: rocks[0].id,
        sprintId: sprint.id,
        ownerId: teamMembers[0].id
      }
    }),
    prisma.story.create({
      data: {
        title: 'פיתוח מסד נתונים',
        description: 'יצירת סכמת DB והקמת שרת',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimate: 8,
        rockId: rocks[0].id,
        sprintId: sprint.id,
        ownerId: teamMembers[0].id
      }
    }),
    prisma.story.create({
      data: {
        title: 'עיצוב ממשק משתמש',
        description: 'יצירת עיצוב UI/UX למסכים העיקריים',
        status: 'TODO',
        priority: 'MEDIUM',
        estimate: 5,
        rockId: rocks[0].id,
        sprintId: sprint.id,
        ownerId: teamMembers[1].id
      }
    }),
    prisma.story.create({
      data: {
        title: 'בדיקת ספקים',
        description: 'השוואה בין 3 ספקי CRM',
        status: 'BLOCKED',
        priority: 'HIGH',
        estimate: 3,
        rockId: rocks[0].id,
        sprintId: sprint.id,
        ownerId: teamMembers[2].id
      }
    }),
    // Stories for Rock 2 (Performance)
    prisma.story.create({
      data: {
        title: 'ניתוח צווארי בקבוק',
        description: 'זיהוי בעיות ביצועים במערכת',
        status: 'TODO',
        priority: 'MEDIUM',
        estimate: 4,
        rockId: rocks[1].id,
        ownerId: teamMembers[0].id
      }
    }),
    // Stories for Rock 3 (Dashboard)
    prisma.story.create({
      data: {
        title: 'איסוף דרישות אנליטיקה',
        description: 'פגישות עם בעלי עניין להבנת הצרכים',
        status: 'TODO',
        priority: 'LOW',
        estimate: 3,
        rockId: rocks[2].id,
        ownerId: teamMembers[1].id
      }
    })
  ]);

  console.log(`✅ Created ${stories.length} stories`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
