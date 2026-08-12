import pg from 'pg';
import { sendTelegramAlert } from './utils/alert.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,                       // Protect PostgreSQL with connection ceiling
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000, // Fast fail if pool is exhausted
  statement_timeout: 5000,        // Kill queries running longer than 5s
});

let consecutiveErrors = 0;
const CIRCUIT_OPEN_THRESHOLD = 10;
const CIRCUIT_RESET_MS = 30_000;
let circuitOpenUntil = 0;

export async function queryWithCircuitBreaker<T extends pg.QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<pg.QueryResult<T>> {
  if (Date.now() < circuitOpenUntil) {
    throw new Error('Database circuit open — temporarily rejecting requests due to high DB load');
  }

  try {
    const result = await pool.query<T>(text, params);
    consecutiveErrors = 0;
    return result;
  } catch (err: any) {
    consecutiveErrors++;
    if (consecutiveErrors >= CIRCUIT_OPEN_THRESHOLD) {
      circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
      const msg = `⚡ <b>CircuitBreaker Active</b>: PostgreSQL encountered ${consecutiveErrors} consecutive errors. Tripped breaker for 30s.\nError: ${err.message}`;
      console.error(msg);
      sendTelegramAlert(msg).catch(() => {});
    }
    throw err;
  }
}
