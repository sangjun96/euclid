import { existsSync } from 'node:fs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

try {
  if (existsSync('./apps/server/drizzle/meta/_journal.json')) {
    await migrate(db, { migrationsFolder: './apps/server/drizzle' });
    console.log('Migrations applied');
  } else {
    console.log('No application migrations yet');
  }
} finally {
  await pool.end();
}
