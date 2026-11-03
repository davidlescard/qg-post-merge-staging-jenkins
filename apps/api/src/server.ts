import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDb } from './db.js';
import { seedIfEmpty } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? resolve(here, '../data/app.db');
const webDist = process.env.WEB_DIST ?? resolve(here, '../../web/dist');

if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
const db = openDb(dbPath);
seedIfEmpty(db);

const app = createApp(db, { enableTestReset: process.env.ENABLE_TEST_RESET === 'true', webDist });
app.listen(port, () => console.log(`Quality Gate Lab listening on http://localhost:${port}`));
