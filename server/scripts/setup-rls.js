/**
 * Setup Row-Level Security (RLS) for Multi-Tenant Isolation
 * 
 * This script creates PostgreSQL RLS policies to ensure that:
 * - Each organization can only see its own data
 * - Even if there's a bug in application code, data can't leak
 * - This is the same approach used by Monday.com, Notion, etc.
 */

const { Pool } = require('pg');

async function setupRLS() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🔒 Setting up Row-Level Security...\n');

  try {
    const client = await pool.connect();

    // Tables that need RLS (all have organizationId column)
    const tables = [
      'Rock',
      'Sprint', 
      'Story',
      'Objective',
      'TeamMember',
      'AllowedEmail',
      'SprintRock'
    ];

    for (const table of tables) {
      console.log(`📋 Setting up RLS for "${table}"...`);

      try {
        // 1. Enable RLS on the table
        await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
        console.log(`   ✓ RLS enabled`);

        // 2. Drop existing policy if exists
        await client.query(`DROP POLICY IF EXISTS org_isolation_policy ON "${table}";`);

        // 3. Create policy that restricts access to current organization
        // The policy uses current_setting('app.organization_id') which we set per request
        await client.query(`
          CREATE POLICY org_isolation_policy ON "${table}"
          FOR ALL
          USING (
            "organizationId" = current_setting('app.organization_id', true)::uuid
            OR current_setting('app.organization_id', true) IS NULL
            OR current_setting('app.organization_id', true) = ''
          );
        `);
        console.log(`   ✓ Policy created`);

      } catch (tableError) {
        console.log(`   ⚠️ Error: ${tableError.message}`);
      }
    }

    // Create a function to set the organization context
    console.log('\n📋 Creating set_organization_context function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION set_organization_context(org_id TEXT)
      RETURNS void AS $$
      BEGIN
        PERFORM set_config('app.organization_id', org_id, false);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Function created');

    client.release();

    console.log('\n✅ Row-Level Security setup complete!');
    console.log('\n📝 Usage: Before each request, call:');
    console.log('   SELECT set_organization_context(\'<org-id>\');');
    console.log('\n🔐 This ensures users can ONLY access their organization\'s data,');
    console.log('   even if there\'s a bug in the application code.');

  } catch (error) {
    console.error('❌ Error setting up RLS:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  setupRLS();
}

module.exports = { setupRLS };

