/**
 * Raw SQL Backup Script
 * סקריפט גיבוי שעובד ישירות עם SQL - לא תלוי ב-Prisma Schema
 * 
 * הרצה: node scripts/backup-raw.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function backup() {
  console.log('🔄 מתחיל גיבוי נתונים (Raw SQL)...\n');
  
  const client = await pool.connect();

  try {
    // יצירת תיקיית גיבויים
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    console.log('📥 שולף נתונים...');

    // שליפת כל הטבלאות
    const tables = [
      'User',
      'TeamMember',
      'Objective',
      'Rock',
      'Sprint',
      'SprintRock',
      'Story',
      'AllowedEmail'
    ];

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      counts: {},
      data: {}
    };

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT * FROM "${table}"`);
        backup.data[table.toLowerCase()] = result.rows;
        backup.counts[table.toLowerCase()] = result.rows.length;
        console.log(`   ✅ ${table}: ${result.rows.length} רשומות`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: לא נמצא או שגיאה - ${error.message}`);
        backup.data[table.toLowerCase()] = [];
        backup.counts[table.toLowerCase()] = 0;
      }
    }

    // שמירת הגיבוי
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');

    console.log('\n✅ גיבוי הושלם בהצלחה!');
    console.log(`📁 קובץ: ${backupFile}`);
    console.log('\n📊 סיכום:');
    Object.entries(backup.counts).forEach(([table, count]) => {
      console.log(`   • ${table}: ${count}`);
    });

    // הדפסת מבנה הטבלאות (לצורך debugging)
    console.log('\n📋 מבנה טבלאות:');
    for (const table of tables) {
      try {
        const columns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        if (columns.rows.length > 0) {
          console.log(`\n   ${table}:`);
          columns.rows.forEach(col => {
            console.log(`      - ${col.column_name} (${col.data_type})`);
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return backupFile;

  } catch (error) {
    console.error('❌ שגיאה בגיבוי:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
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

