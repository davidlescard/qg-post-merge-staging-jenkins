import { expect } from 'chai';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { SEED_RUNS, resetAndSeed } from '../src/seed.js';

describe('API', () => {
  let server: Server;
  let base: string;
  const db = openDb(':memory:');

  before((done) => {
    server = createApp(db, { enableTestReset: true }).listen(0, () => {
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      done();
    });
  });
  after((done) => {
    server.close(done);
  });
  beforeEach(() => resetAndSeed(db));

  const json = (path: string, init?: RequestInit) =>
    fetch(base + path, { ...init, headers: { 'content-type': 'application/json' } });

  it('reports health', async () => {
    const res = await json('/api/health');
    expect(res.status).to.equal(200);
    expect(await res.json()).to.deep.equal({ status: 'ok' });
  });

  it('lists seeded runs newest first', async () => {
    const runs = (await (await json('/api/runs')).json()) as { name: string }[];
    expect(runs).to.have.length(SEED_RUNS.length);
    expect(runs[0].name).to.equal('Login Flow');
  });

  it('filters by status and search', async () => {
    const failed = (await (await json('/api/runs?status=failed')).json()) as unknown[];
    expect(failed).to.have.length(2);
    const found = (await (await json('/api/runs?search=checkout')).json()) as { name: string }[];
    expect(found.map((r) => r.name)).to.deep.equal(['Checkout Regression']);
  });

  it('rejects an invalid status filter', async () => {
    expect((await json('/api/runs?status=nope')).status).to.equal(400);
  });

  it('returns 404 for a missing run', async () => {
    expect((await json('/api/runs/9999')).status).to.equal(404);
  });

  it('creates a run', async () => {
    const res = await json('/api/runs', { method: 'POST', body: JSON.stringify({ name: 'New Run', branch: 'dev' }) });
    expect(res.status).to.equal(201);
    const created = (await res.json()) as { id: number; status: string };
    expect(created.status).to.equal('queued');
    expect((await json(`/api/runs/${created.id}`)).status).to.equal(200);
  });

  it('returns field errors for an invalid run', async () => {
    const res = await json('/api/runs', { method: 'POST', body: JSON.stringify({ name: '' }) });
    expect(res.status).to.equal(400);
    expect(((await res.json()) as { errors: object }).errors).to.have.keys('name', 'branch');
  });

  it('updates a status', async () => {
    const res = await json('/api/runs/5', { method: 'PATCH', body: JSON.stringify({ status: 'running' }) });
    expect(res.status).to.equal(200);
    expect(((await res.json()) as { status: string }).status).to.equal('running');
  });

  it('rejects a bad status update and malformed JSON', async () => {
    expect((await json('/api/runs/5', { method: 'PATCH', body: JSON.stringify({ status: 'x' }) })).status).to.equal(400);
    expect((await json('/api/runs', { method: 'POST', body: '{bad' })).status).to.equal(400);
  });

  it('resets data through the test endpoint', async () => {
    await json('/api/runs', { method: 'POST', body: JSON.stringify({ name: 'Extra', branch: 'dev' }) });
    expect((await json('/api/test/reset', { method: 'POST' })).status).to.equal(204);
    expect(((await (await json('/api/runs')).json()) as unknown[]).length).to.equal(SEED_RUNS.length);
  });
});

describe('API without test reset enabled', () => {
  it('does not expose the reset endpoint', async () => {
    const server = createApp(openDb(':memory:')).listen(0);
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/api/test/reset`, { method: 'POST' });
    expect(res.status).to.equal(404);
    server.close();
  });
});
