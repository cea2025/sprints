/**
 * Migration Script: Update all entity codes to new format
 * 
 * Formats:
 * - Projects (Objectives): p-01, p-02, ...
 * - Rocks: s-01, s-02, ...
 * - Stories (Milestones): ed-01, ed-02, ...
 * - Tasks: m-01, m-02, ...
 * 
 * Run: node scripts/migrate-all-codes.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateAllCodes() {
  console.log('🚀 Starting comprehensive code migration...\n');

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    console.log(`Found ${organizations.length} organizations\n`);

    for (const org of organizations) {
      console.log(`\n📁 Processing organization: ${org.name}`);
      console.log('='.repeat(50));

      // 1. Migrate Projects (Objectives)
      await migrateProjects(org.id);

      // 2. Migrate Rocks
      await migrateRocks(org.id);

      // 3. Migrate Stories
      await migrateStories(org.id);

      // 4. Migrate Tasks
      await migrateTasks(org.id);
    }

    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateProjects(organizationId) {
  const projects = await prisma.objective.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n  📌 Projects: ${projects.length} found`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const newCode = `p-${(i + 1).toString().padStart(2, '0')}`;

    // Skip if already in correct format
    if (project.code === newCode) {
      skipped++;
      continue;
    }

    await prisma.objective.update({
      where: { id: project.id },
      data: { code: newCode }
    });

    console.log(`     ✅ "${project.code}" → "${newCode}" (${project.name})`);
    updated++;
  }

  console.log(`     📊 Updated: ${updated}, Skipped: ${skipped}`);
}

async function migrateRocks(organizationId) {
  const rocks = await prisma.rock.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n  🪨 Rocks: ${rocks.length} found`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rocks.length; i++) {
    const rock = rocks[i];
    const newCode = `s-${(i + 1).toString().padStart(2, '0')}`;

    // Skip if already in correct format
    if (rock.code === newCode) {
      skipped++;
      continue;
    }

    await prisma.rock.update({
      where: { id: rock.id },
      data: { code: newCode }
    });

    console.log(`     ✅ "${rock.code}" → "${newCode}" (${rock.name})`);
    updated++;
  }

  console.log(`     📊 Updated: ${updated}, Skipped: ${skipped}`);
}

async function migrateStories(organizationId) {
  const stories = await prisma.story.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n  📍 Stories (Milestones): ${stories.length} found`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const newCode = `ed-${(i + 1).toString().padStart(2, '0')}`;

    // Skip if already in correct format
    if (story.code === newCode) {
      skipped++;
      continue;
    }

    await prisma.story.update({
      where: { id: story.id },
      data: { code: newCode }
    });

    if (story.code) {
      console.log(`     ✅ "${story.code}" → "${newCode}" (${story.title})`);
    } else {
      console.log(`     ✅ (null) → "${newCode}" (${story.title})`);
    }
    updated++;
  }

  console.log(`     📊 Updated: ${updated}, Skipped: ${skipped}`);
}

async function migrateTasks(organizationId) {
  const tasks = await prisma.task.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n  ✅ Tasks: ${tasks.length} found`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const newCode = `m-${(i + 1).toString().padStart(2, '0')}`;

    // Skip if already in correct format
    if (task.code === newCode) {
      skipped++;
      continue;
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { code: newCode }
    });

    if (task.code) {
      console.log(`     ✅ "${task.code}" → "${newCode}" (${task.title})`);
    } else {
      console.log(`     ✅ (null) → "${newCode}" (${task.title})`);
    }
    updated++;
  }

  console.log(`     📊 Updated: ${updated}, Skipped: ${skipped}`);
}

// Run the migration
migrateAllCodes();

