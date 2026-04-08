/**
 * Run database migrations
 *
 * Usage: npx tsx scripts/run-migration.ts <migration-file>
 *
 * Example: npx tsx scripts/run-migration.ts scripts/migrations/001_create_initial_tables.sql
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { closeDatabase, query } from '../apps/server/src/shared/db/client.js';

async function runMigration(migrationFile: string) {
  const migrationPath = resolve(process.cwd(), migrationFile);

  console.log(`Running migration: ${migrationFile}`);

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    await query(sql);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>');
  console.error(
    'Example: npx tsx scripts/run-migration.ts scripts/migrations/001_create_initial_tables.sql',
  );
  process.exit(1);
}

runMigration(migrationFile);
