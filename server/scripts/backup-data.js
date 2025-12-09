/**
 * Backup Data Script
 * סקריפט גיבוי נתונים לפני Migration
 * 
 * הרצה: node scripts/backup-data.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
  console.log('🔄 מתחיל גיבוי נתונים...\n');

  try {
    // יצירת תיקיית גיבויים
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // שליפת כל הנתונים
    console.log('📥 שולף נתונים...');

    const [
      users,
      teamMembers,
      objectives,
      rocks,
      sprints,
      sprintRocks,
      stories,
      allowedEmails
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.teamMember.findMany(),
      prisma.objective.findMany(),
      prisma.rock.findMany(),
      prisma.sprint.findMany(),
      prisma.sprintRock.findMany(),
      prisma.story.findMany(),
      prisma.allowedEmail.findMany()
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      counts: {
        users: users.length,
        teamMembers: teamMembers.length,
        objectives: objectives.length,
        rocks: rocks.length,
        sprints: sprints.length,
        sprintRocks: sprintRocks.length,
        stories: stories.length,
        allowedEmails: allowedEmails.length
      },
      data: {
        users,
        teamMembers,
        objectives,
        rocks,
        sprints,
        sprintRocks,
        stories,
        allowedEmails
      }
    };

    // שמירת הגיבוי
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');

    console.log('\n✅ גיבוי הושלם בהצלחה!');
    console.log(`📁 קובץ: ${backupFile}`);
    console.log('\n📊 סיכום:');
    console.log(`   • משתמשים: ${users.length}`);
    console.log(`   • חברי צוות: ${teamMembers.length}`);
    console.log(`   • פרויקטים: ${objectives.length}`);
    console.log(`   • סלעים: ${rocks.length}`);
    console.log(`   • ספרינטים: ${sprints.length}`);
    console.log(`   • קשרי ספרינט-סלע: ${sprintRocks.length}`);
    console.log(`   • אבני דרך: ${stories.length}`);
    console.log(`   • מיילים מורשים: ${allowedEmails.length}`);

    return backupFile;

  } catch (error) {
    console.error('❌ שגיאה בגיבוי:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרצה
backup()
  .then(file => {
    console.log('\n🎉 הגיבוי נשמר ב:', file);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 הגיבוי נכשל:', error);
    process.exit(1);
  });

