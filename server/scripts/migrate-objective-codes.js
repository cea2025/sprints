/**
 * Script to migrate project codes from "OBJ-XX" format to "XX" format
 * Run with: node scripts/migrate-objective-codes.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateObjectiveCodes() {
  console.log('🚀 Starting project codes migration...\n');

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    console.log(`Found ${organizations.length} organizations\n`);

    for (const org of organizations) {
      console.log(`📁 Processing organization: ${org.name}`);

      // Get all projects for this organization, ordered by creation date
      const objectives = await prisma.objective.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'asc' }
      });

      if (objectives.length === 0) {
        console.log('   No projects found\n');
        continue;
      }

      console.log(`   Found ${objectives.length} projects`);

      // Update each project with new running number
      for (let i = 0; i < objectives.length; i++) {
        const objective = objectives[i];
        const newCode = (i + 1).toString().padStart(2, '0'); // 01, 02, 03...
        
        if (objective.code !== newCode) {
          await prisma.objective.update({
            where: { id: objective.id },
            data: { code: newCode }
          });
          console.log(`   ✅ Updated: "${objective.code}" → "${newCode}" (${objective.name})`);
        } else {
          console.log(`   ⏭️  Skipped: "${objective.code}" (already correct)`);
        }
      }

      console.log('');
    }

    console.log('✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateObjectiveCodes();

