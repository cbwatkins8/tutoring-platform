import 'server-only';

import { Pool } from 'pg';

declare global {
  var civilTutoringPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_SIZE || (process.env.NODE_ENV === 'production' ? 5 : 10)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const pool = globalThis.civilTutoringPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.civilTutoringPool = pool;
}
