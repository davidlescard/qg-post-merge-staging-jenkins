import express, { type ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { RUN_COLUMNS, type Db, type Run } from './db.js';
import { resetAndSeed } from './seed.js';
import { isStatus, validateNewRun } from './validation.js';

export interface AppOptions {
  enableTestReset?: boolean;
  webDist?: string;
}

export function createApp(db: Db, options: AppOptions = {}) {
  const app = express();
  app.use(express.json());

  const health = (_req: express.Request, res: express.Response) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  };
  app.get('/health', health);
  app.get('/api/health', health);

  app.get('/api/runs', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    if (status && !isStatus(status)) {
      res.status(400).json({ errors: { status: 'Invalid status filter' } });
      return;
    }

    const where: string[] = [];
    const params: Record<string, string> = {};
    if (search) {
      where.push(`name LIKE '%' || @search || '%'`);
      params.search = search;
    }
    if (status) {
      where.push('status = @status');
      params.status = status;
    }
    const sql = `SELECT ${RUN_COLUMNS} FROM runs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC`;
    res.json(db.prepare(sql).all(params) as unknown as Run[]);
  });

  app.get('/api/runs/:id', (req, res) => {
    const run = db.prepare(`SELECT ${RUN_COLUMNS} FROM runs WHERE id = ?`).get(Number(req.params.id)) as unknown as Run | undefined;
    if (!run) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    res.json(run);
  });

  app.post('/api/runs', (req, res) => {
    const { value, errors } = validateNewRun(req.body);
    if (!value) {
      res.status(400).json({ errors });
      return;
    }
    const info = db
      .prepare(`INSERT INTO runs (name, branch, status, notes, created_at) VALUES (@name, @branch, @status, @notes, @createdAt)`)
      .run({ ...value, createdAt: new Date().toISOString() });
    const run = db.prepare(`SELECT ${RUN_COLUMNS} FROM runs WHERE id = ?`).get(info.lastInsertRowid) as unknown as Run;
    res.status(201).json(run);
  });

  app.patch('/api/runs/:id', (req, res) => {
    const status = req.body?.status;
    if (!isStatus(status)) {
      res.status(400).json({ errors: { status: 'Status must be one of: queued, running, passed, failed' } });
      return;
    }
    const info = db.prepare('UPDATE runs SET status = ? WHERE id = ?').run(status, Number(req.params.id));
    if (info.changes === 0) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    res.json(db.prepare(`SELECT ${RUN_COLUMNS} FROM runs WHERE id = ?`).get(Number(req.params.id)));
  });

  if (options.enableTestReset) {
    app.post('/api/test/reset', (_req, res) => {
      resetAndSeed(db);
      res.status(204).end();
    });
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (options.webDist && existsSync(join(options.webDist, 'index.html'))) {
    app.use(express.static(options.webDist));
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = err?.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ error: status === 400 ? 'Invalid JSON body' : 'Internal server error' });
  };
  app.use(onError);

  return app;
}
