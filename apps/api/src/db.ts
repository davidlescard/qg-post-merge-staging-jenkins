import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

export const STATUSES = ['queued', 'running', 'passed', 'failed'] as const;
export type Status = (typeof STATUSES)[number];

export interface Run {
  id: number;
  name: string;
  branch: string;
  status: Status;
  durationSeconds: number;
  notes: string;
  createdAt: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','passed','failed')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);`;

export const RUN_COLUMNS = `id, name, branch, status, duration_seconds AS durationSeconds, notes, created_at AS createdAt`;

export function openDb(path: string): Db {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}
