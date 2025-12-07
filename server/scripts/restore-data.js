/**
 * Restore Data Script
 * סקריפט שחזור נתונים מגיבוי
 * 
 * הרצה: node scripts/restore-data.js [backup-file]
 * דוגמה: node scripts/restore-data.js backup-2025-12-07T10-30-00-000Z.json
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restore(backupFileName) {
  console.log('🔄 מתחיל שחזור נתונים...\n');

  try {
    // מציאת קובץ הגיבוי
    const backupDir = path.join(__dirname, '../backups');
    let backupFile;

    if (backupFileName) {
      backupFile = path.join(backupDir, backupFileName);
    } else {
      // מצא את הגיבוי האחרון
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        throw new Error('לא נמצאו קבצי גיבוי');
      }
      
      backupFile = path.join(backupDir, files[0]);
      console.log(`📂 משתמש בגיבוי האחרון: ${files[0]}`);
    }

    if (!fs.existsSync(backupFile)) {
      throw new Error(`קובץ גיבוי לא נמצא: ${backupFile}`);
    }

    // טעינת הגיבוי
    console.log('📥 טוען גיבוי...');
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    console.log(`📊 גיבוי מתאריך: ${backup.timestamp}`);
    console.log(`   • משתמשים: ${backup.counts.users}`);
    console.log(`   • חברי צוות: ${backup.counts.teamMembers}`);
    console.log(`   • מטרות-על: ${backup.counts.objectives}`);
    console.log(`   • סלעים: ${backup.counts.rocks}`);
    console.log(`   • ספרינטים: ${backup.counts.sprints}`);
    console.log(`   • אבני דרך: ${backup.counts.stories}`);

    // אישור מהמשתמש
    console.log('\n⚠️  שחזור יימחק את כל הנתונים הקיימים!');
    console.log('   להמשך, הוסף --confirm לפקודה');
    
    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ בוטל - לא אושר');
      return;
    }

    console.log('\n🗑️  מוחק נתונים קיימים...');

    // מחיקה בסדר הפוך (בגלל foreign keys)
    await prisma.$transaction([
      prisma.story.deleteMany(),
      prisma.sprintRock.deleteMany(),
      prisma.sprint.deleteMany(),
      prisma.rock.deleteMany(),
      prisma.objective.deleteMany(),
      prisma.teamMember.deleteMany(),
      prisma.allowedEmail.deleteMany(),
      prisma.organizationMember.deleteMany(),
      prisma.organization.deleteMany(),
      prisma.user.deleteMany()
    ]);

    console.log('✅ נתונים קיימים נמחקו');

    // שחזור בסדר הנכון
    console.log('\n📤 משחזר נתונים...');

    // Users
    if (backup.data.users.length > 0) {
      for (const user of backup.data.users) {
        await prisma.user.create({
          data: {
            id: user.id,
            googleId: user.googleId,
            email: user.email,
            name: user.name,
            picture: user.picture,
            role: user.role,
            isActive: user.isActive,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.users.length} משתמשים`);
    }

    // TeamMembers
    if (backup.data.teamMembers.length > 0) {
      for (const tm of backup.data.teamMembers) {
        await prisma.teamMember.create({
          data: {
            id: tm.id,
            name: tm.name,
            role: tm.role,
            capacity: tm.capacity,
            isActive: tm.isActive,
            userId: tm.userId,
            createdAt: new Date(tm.createdAt),
            updatedAt: new Date(tm.updatedAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.teamMembers.length} חברי צוות`);
    }

    // Objectives
    if (backup.data.objectives.length > 0) {
      for (const obj of backup.data.objectives) {
        await prisma.objective.create({
          data: {
            id: obj.id,
            code: obj.code,
            name: obj.name,
            description: obj.description,
            ownerId: obj.ownerId,
            createdAt: new Date(obj.createdAt),
            updatedAt: new Date(obj.updatedAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.objectives.length} מטרות-על`);
    }

    // Rocks
    if (backup.data.rocks.length > 0) {
      for (const rock of backup.data.rocks) {
        await prisma.rock.create({
          data: {
            id: rock.id,
            code: rock.code,
            name: rock.name,
            description: rock.description,
            year: rock.year,
            quarter: rock.quarter,
            progress: rock.progress,
            isCarriedOver: rock.isCarriedOver,
            carriedFromQuarter: rock.carriedFromQuarter,
            ownerId: rock.ownerId,
            objectiveId: rock.objectiveId,
            createdAt: new Date(rock.createdAt),
            updatedAt: new Date(rock.updatedAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.rocks.length} סלעים`);
    }

    // Sprints
    if (backup.data.sprints.length > 0) {
      for (const sprint of backup.data.sprints) {
        await prisma.sprint.create({
          data: {
            id: sprint.id,
            name: sprint.name,
            goal: sprint.goal,
            year: sprint.year,
            quarter: sprint.quarter,
            sprintNumber: sprint.sprintNumber,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
            createdAt: new Date(sprint.createdAt),
            updatedAt: new Date(sprint.updatedAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.sprints.length} ספרינטים`);
    }

    // SprintRocks
    if (backup.data.sprintRocks.length > 0) {
      for (const sr of backup.data.sprintRocks) {
        await prisma.sprintRock.create({
          data: {
            id: sr.id,
            sprintId: sr.sprintId,
            rockId: sr.rockId,
            createdAt: new Date(sr.createdAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.sprintRocks.length} קשרי ספרינט-סלע`);
    }

    // Stories
    if (backup.data.stories.length > 0) {
      for (const story of backup.data.stories) {
        await prisma.story.create({
          data: {
            id: story.id,
            title: story.title,
            description: story.description,
            progress: story.progress,
            isBlocked: story.isBlocked,
            sprintId: story.sprintId,
            rockId: story.rockId,
            ownerId: story.ownerId,
            createdAt: new Date(story.createdAt),
            updatedAt: new Date(story.updatedAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.stories.length} אבני דרך`);
    }

    // AllowedEmails
    if (backup.data.allowedEmails.length > 0) {
      for (const email of backup.data.allowedEmails) {
        await prisma.allowedEmail.create({
          data: {
            id: email.id,
            email: email.email,
            name: email.name,
            role: email.role,
            note: email.note,
            addedBy: email.addedBy,
            createdAt: new Date(email.createdAt),
            updatedAt: new Date(email.updatedAt)
          }
        });
      }
      console.log(`   ✅ ${backup.data.allowedEmails.length} מיילים מורשים`);
    }

    console.log('\n✅ שחזור הושלם בהצלחה!');
    console.log('⚠️  שים לב: נתוני Organization לא שוחזרו - תצטרך להריץ את ה-migration מחדש');

  } catch (error) {
    console.error('❌ שגיאה בשחזור:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרצה
const backupFile = process.argv[2];
restore(backupFile)
  .then(() => {
    console.log('\n🎉 סיום');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 שחזור נכשל:', error);
    process.exit(1);
  });

