import type { Db, Status } from './db.js';

interface SeedRun {
  name: string;
  branch: string;
  status: Status;
  durationSeconds: number;
  notes: string;
  createdAt: string;
}

// Fixed values keep every test run deterministic.
export const SEED_RUNS: SeedRun[] = [
  { name: 'Checkout Regression', branch: 'main', status: 'passed', durationSeconds: 312, notes: 'All 48 checks passed.', createdAt: '2026-01-05T09:00:00.000Z' },
  { name: 'Payments Smoke', branch: 'main', status: 'passed', durationSeconds: 95, notes: 'Smoke suite green.', createdAt: '2026-01-06T09:00:00.000Z' },
  { name: 'Search Indexing', branch: 'feature/search', status: 'failed', durationSeconds: 204, notes: 'Timeout waiting for index refresh.', createdAt: '2026-01-07T09:00:00.000Z' },
  { name: 'Profile Settings', branch: 'feature/profile', status: 'running', durationSeconds: 41, notes: 'In progress.', createdAt: '2026-01-08T09:00:00.000Z' },
  { name: 'Inventory Sync', branch: 'main', status: 'queued', durationSeconds: 0, notes: 'Waiting for an available agent.', createdAt: '2026-01-09T09:00:00.000Z' },
  { name: 'Notifications API', branch: 'feature/notify', status: 'failed', durationSeconds: 150, notes: 'Unexpected 500 from the email provider stub.', createdAt: '2026-01-10T09:00:00.000Z' },
  { name: 'Reporting Export', branch: 'release/1.2', status: 'passed', durationSeconds: 268, notes: 'CSV and PDF exports verified.', createdAt: '2026-01-11T09:00:00.000Z' },
  { name: 'Login Flow', branch: 'release/1.2', status: 'passed', durationSeconds: 77, notes: 'Session handling verified.', createdAt: '2026-01-12T09:00:00.000Z' },
];

export function resetAndSeed(db: Db): void {
  const insert = db.prepare(
    `INSERT INTO runs (name, branch, status, duration_seconds, notes, created_at)
     VALUES (@name, @branch, @status, @durationSeconds, @notes, @createdAt)`,
  );
  db.exec('BEGIN');
  try {
    db.exec(`DELETE FROM runs; DELETE FROM sqlite_sequence WHERE name = 'runs';`);
    for (const run of SEED_RUNS) insert.run({ ...run });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function seedIfEmpty(db: Db): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM runs').get() as unknown as { count: number };
  if (count === 0) resetAndSeed(db);
}
