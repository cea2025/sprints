/**
 * Create Session Table
 * יוצר את טבלת ה-sessions ידנית
 * 
 * הרצה: node scripts/create-session-table.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createSessionTable() {
  console.log('🔄 יוצר טבלת sessions...');
  
  const client = await pool.connect();

  try {
    // יצירת הטבלה לפי המבנה של connect-pg-simple
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      );
    `);

    // יצירת אינדקס לביצועים
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    console.log('✅ טבלת sessions נוצרה בהצלחה!');

    // בדיקה
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session'
    `);
    
    console.log('\n📋 מבנה הטבלה:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSessionTable()
  .then(() => {
    console.log('\n🎉 סיום');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 נכשל:', error);
    process.exit(1);
  });

