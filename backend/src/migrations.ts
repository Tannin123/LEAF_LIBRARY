import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from './db';

const MIGRATION_LOCK_ID = '781235901245';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query(`SELECT pg_advisory_lock(${MIGRATION_LOCK_ID}::bigint)`);
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS ixs_schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const directory = join(process.cwd(), 'migrations');
    const filenames = (await readdir(directory))
      .filter(filename => /^\d+_[a-z0-9_-]+\.sql$/i.test(filename))
      .sort();

    for (const filename of filenames) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM ixs_schema_migrations WHERE filename=$1',
        [filename]
      );
      if (alreadyApplied.rowCount) continue;

      await client.query('BEGIN');
      try {
        const sql = await readFile(join(directory, filename), 'utf8');
        if (!sql.trim()) throw new Error(`Migration ${filename} is empty`);
        await client.query(sql);
        await client.query('INSERT INTO ixs_schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`Applied database migration: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      if (lockAcquired) await client.query(`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID}::bigint)`);
    } finally {
      client.release();
    }
  }
}
