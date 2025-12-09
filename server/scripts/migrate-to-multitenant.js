/**
 * Migration Script: Single Tenant → Multi-Tenant
 * סקריפט העברת נתונים למבנה Multi-Tenant
 * 
 * מה הסקריפט עושה:
 * 1. יוצר ארגון ברירת מחדל
 * 2. מקשר את כל המשתמשים לארגון
 * 3. מעדכן את כל הישויות עם organizationId
 * 4. מוסיף Audit fields (createdBy, updatedBy)
 * 
 * הרצה: node scripts/migrate-to-multitenant.js
 * 
 * ⚠️ הרץ את backup-data.js לפני!
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// הגדרות ארגון ברירת מחדל
const DEFAULT_ORG = {
  name: 'הארגון שלי',
  slug: 'my-organization'
};

async function migrate() {
  console.log('🚀 מתחיל Migration ל-Multi-Tenant...\n');
  console.log('=' .repeat(50));

  try {
    // ===============================================
    // שלב 1: טעינת גיבוי (אם קיים)
    // ===============================================
    console.log('\n📂 שלב 1: בדיקת גיבוי...');
    
    const backupDir = path.join(__dirname, '../backups');
    let backupData = null;
    
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-'));
      if (files.length > 0) {
        const latestBackup = files.sort().reverse()[0];
        const backupPath = path.join(backupDir, latestBackup);
        backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`   ✅ נמצא גיבוי: ${latestBackup}`);
        console.log(`   📊 נתונים: ${backupData.counts.users} משתמשים, ${backupData.counts.rocks} סלעים`);
      }
    }
    
    if (!backupData) {
      console.log('   ⚠️ לא נמצא גיבוי - ממשיך בזהירות');
    }

    // ===============================================
    // שלב 2: יצירת ארגון ברירת מחדל
    // ===============================================
    console.log('\n🏢 שלב 2: יצירת ארגון ברירת מחדל...');
    
    let organization = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORG.slug }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: DEFAULT_ORG.name,
          slug: DEFAULT_ORG.slug,
          isActive: true,
          settings: {
            theme: 'auto',
            language: 'he'
          }
        }
      });
      console.log(`   ✅ ארגון נוצר: ${organization.name} (${organization.id})`);
    } else {
      console.log(`   ℹ️ ארגון כבר קיים: ${organization.name}`);
    }

    const orgId = organization.id;

    // ===============================================
    // שלב 3: קישור משתמשים לארגון
    // ===============================================
    console.log('\n👥 שלב 3: קישור משתמשים לארגון...');
    
    const users = await prisma.user.findMany();
    let linkedUsers = 0;
    let firstAdminId = null;

    for (const user of users) {
      // בדוק אם כבר מקושר
      const existing = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: orgId
          }
        }
      });

      if (!existing) {
        // המשתמש הראשון יהיה ADMIN, השאר ישמרו על התפקיד הקיים
        const role = linkedUsers === 0 ? 'ADMIN' : user.role;
        
        await prisma.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: orgId,
            role: role,
            isActive: user.isActive
          }
        });
        linkedUsers++;
        
        if (!firstAdminId && role === 'ADMIN') {
          firstAdminId = user.id;
        }
      }
    }
    console.log(`   ✅ קושרו ${linkedUsers} משתמשים לארגון`);

    // ===============================================
    // שלב 4: עדכון TeamMembers עם organizationId
    // ===============================================
    console.log('\n👤 שלב 4: עדכון חברי צוות...');
    
    const teamMembersUpdated = await prisma.teamMember.updateMany({
      where: { organizationId: null },
      data: { 
        organizationId: orgId,
        createdBy: firstAdminId
      }
    });
    console.log(`   ✅ עודכנו ${teamMembersUpdated.count} חברי צוות`);

    // ===============================================
    // שלב 5: עדכון Objectives עם organizationId
    // ===============================================
    console.log('\n🎯 שלב 5: עדכון פרויקטים...');
    
    const objectivesUpdated = await prisma.objective.updateMany({
      where: { organizationId: null },
      data: { 
        organizationId: orgId,
        createdBy: firstAdminId
      }
    });
    console.log(`   ✅ עודכנו ${objectivesUpdated.count} פרויקטים`);

    // ===============================================
    // שלב 6: עדכון Rocks עם organizationId
    // ===============================================
    console.log('\n🪨 שלב 6: עדכון סלעים...');
    
    const rocksUpdated = await prisma.rock.updateMany({
      where: { organizationId: null },
      data: { 
        organizationId: orgId,
        createdBy: firstAdminId
      }
    });
    console.log(`   ✅ עודכנו ${rocksUpdated.count} סלעים`);

    // ===============================================
    // שלב 7: עדכון Sprints עם organizationId
    // ===============================================
    console.log('\n🏃 שלב 7: עדכון ספרינטים...');
    
    const sprintsUpdated = await prisma.sprint.updateMany({
      where: { organizationId: null },
      data: { 
        organizationId: orgId,
        createdBy: firstAdminId
      }
    });
    console.log(`   ✅ עודכנו ${sprintsUpdated.count} ספרינטים`);

    // ===============================================
    // שלב 8: עדכון Stories עם organizationId
    // ===============================================
    console.log('\n📋 שלב 8: עדכון אבני דרך...');
    
    const storiesUpdated = await prisma.story.updateMany({
      where: { organizationId: null },
      data: { 
        organizationId: orgId,
        createdBy: firstAdminId
      }
    });
    console.log(`   ✅ עודכנו ${storiesUpdated.count} אבני דרך`);

    // ===============================================
    // שלב 9: עדכון AllowedEmails עם organizationId
    // ===============================================
    console.log('\n📧 שלב 9: עדכון מיילים מורשים...');
    
    const emailsUpdated = await prisma.allowedEmail.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });
    console.log(`   ✅ עודכנו ${emailsUpdated.count} מיילים מורשים`);

    // ===============================================
    // שלב 10: אימות ה-Migration
    // ===============================================
    console.log('\n🔍 שלב 10: אימות...');
    
    const verification = await prisma.$transaction([
      prisma.organizationMember.count({ where: { organizationId: orgId } }),
      prisma.teamMember.count({ where: { organizationId: orgId } }),
      prisma.objective.count({ where: { organizationId: orgId } }),
      prisma.rock.count({ where: { organizationId: orgId } }),
      prisma.sprint.count({ where: { organizationId: orgId } }),
      prisma.story.count({ where: { organizationId: orgId } }),
      prisma.allowedEmail.count({ where: { organizationId: orgId } })
    ]);

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Migration הושלם בהצלחה!\n');
    console.log('📊 סיכום סופי:');
    console.log(`   🏢 ארגון: ${organization.name}`);
    console.log(`   👥 חברי ארגון: ${verification[0]}`);
    console.log(`   👤 חברי צוות: ${verification[1]}`);
    console.log(`   🎯 פרויקטים: ${verification[2]}`);
    console.log(`   🪨 סלעים: ${verification[3]}`);
    console.log(`   🏃 ספרינטים: ${verification[4]}`);
    console.log(`   📋 אבני דרך: ${verification[5]}`);
    console.log(`   📧 מיילים מורשים: ${verification[6]}`);

    // שמירת לוג Migration
    const logFile = path.join(__dirname, '../backups', `migration-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(logFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      organization: organization,
      verification: {
        orgMembers: verification[0],
        teamMembers: verification[1],
        objectives: verification[2],
        rocks: verification[3],
        sprints: verification[4],
        stories: verification[5],
        allowedEmails: verification[6]
      }
    }, null, 2), 'utf8');
    
    console.log(`\n📝 לוג נשמר: ${logFile}`);

    return organization;

  } catch (error) {
    console.error('\n❌ שגיאה ב-Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרצה
migrate()
  .then(org => {
    console.log('\n🎉 המערכת מוכנה לשימוש!');
    console.log(`   URL: /select-organization`);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration נכשל:', error);
    process.exit(1);
  });

