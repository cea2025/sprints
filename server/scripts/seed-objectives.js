const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const objectives = [
  { code: "OBJ-01", name: "חינוך לחיים טובים", description: "קידום חינוך ערכי ומיומנויות חיים" },
  { code: "OBJ-02", name: "הורים מעורבים", description: "שיתוף פעולה עם הורים" },
  { code: "OBJ-03", name: "זהות יהודית ישראלית", description: "חיזוק הזהות היהודית" },
  { code: "OBJ-04", name: "תפילה", description: "העמקת חוויית התפילה" },
  { code: "OBJ-05", name: "משמעת מכבדת", description: "בניית סביבה מכבדת ובטוחה" },
  { code: "OBJ-06", name: "גמילות חסדים", description: "טיפוח ערכי נתינה וחסד" },
  { code: "OBJ-07", name: "מצוינות בתורה", description: "קידום לימוד תורה ברמה גבוהה" },
  { code: "OBJ-08", name: "מצוינות אקדמית", description: "השגת הישגים לימודיים גבוהים" },
  { code: "OBJ-09", name: "יסודות איתנים", description: "בניית בסיס יציב לבית הספר" },
  { code: "OBJ-10", name: "גיוס ושימור", description: "גיוס ושימור כוח אדם איכותי" }
];

async function seed() {
  console.log('🌱 Seeding objectives...');
  
  for (const obj of objectives) {
    try {
      await prisma.objective.upsert({
        where: { code: obj.code },
        update: { name: obj.name, description: obj.description },
        create: obj
      });
      console.log(`✅ ${obj.code}: ${obj.name}`);
    } catch (error) {
      console.error(`❌ Error seeding ${obj.code}:`, error.message);
    }
  }
  
  console.log('✅ Objectives seeding complete!');
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
