import './env.mjs';

import { readFile } from 'node:fs/promises';

import pg from 'pg';

const { Pool } = pg;

function getDatabaseUrl() {
  const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing NEON_DATABASE_URL. Add it to backend/.env before starting the server.');
  }

  return connectionString;
}

function shouldUseSsl(connectionString) {
  return (
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('ssl=true')
  );
}

const connectionString = getDatabaseUrl();

export const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
});

export async function ensureDatabaseSchema() {
  const schemaPath = new URL('./schema.sql', import.meta.url);
  const schemaSql = await readFile(schemaPath, 'utf8');
  await pool.query(schemaSql);
}

export async function withTransaction(handler) {
  const client = await pool.connect();

  try {
    await client.query('begin');
    const result = await handler(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
