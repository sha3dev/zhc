/**
 * Test database connection
 *
 * Run with: npx tsx scripts/test-db.ts
 */

import { closeDatabase, query, testConnection } from '../src/db/client.js';

async function main() {
  try {
    console.log('Testing database connection...');
    await testConnection();

    console.log('\nTesting query execution...');
    const result = await query('SELECT version() as version, NOW() as now');
    console.log('Query result:', result.rows[0]);

    console.log('\n✅ All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
