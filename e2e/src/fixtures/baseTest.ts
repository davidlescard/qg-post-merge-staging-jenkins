import { test as baseTest, expect } from '@playwright/test';
import { findUp } from 'find-up-simple';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname } from 'node:path';
import { DashboardPage } from '@pages/dashboard.page';

const BASE_PORT = 3100;

async function waitForHealth(url: string, server: ChildProcess, timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (server.exitCode !== null) throw new Error(`Test server exited early with code ${server.exitCode}`);
        try {
            if ((await fetch(`${url}/health`)).ok) return;
        } catch {
            // not accepting connections yet
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Test server at ${url} was not healthy within ${timeoutMs}ms`);
}

type Fixtures = {
    dashboardPage: DashboardPage;
    resetData: void;
};

type WorkerFixtures = {
    workerServer: { url: string; external: boolean };
};

export const test = baseTest.extend<Fixtures, WorkerFixtures>({
    // One app instance with its own in-memory database per worker. BASE_URL targets an external app instead.
    workerServer: [
        async ({}, use, workerInfo) => {
            if (process.env.BASE_URL) {
                await use({ url: process.env.BASE_URL, external: true });
                return;
            }
            const workspaceFile = await findUp('pnpm-workspace.yaml', { cwd: import.meta.dirname });
            if (!workspaceFile) throw new Error('Could not locate the repo root (pnpm-workspace.yaml)');
            const repoRoot = dirname(workspaceFile);
            const port = BASE_PORT + workerInfo.parallelIndex;
            const url = `http://localhost:${port}`;
            const server = spawn(process.execPath, ['apps/api/dist/server.js'], {
                cwd: repoRoot,
                env: { ...process.env, PORT: String(port), DB_PATH: ':memory:', ENABLE_TEST_RESET: 'true' },
                stdio: ['ignore', 'ignore', 'inherit'],
            });
            try {
                await waitForHealth(url, server);
                await use({ url, external: false });
            } finally {
                if (server.exitCode === null) {
                    server.kill();
                    await new Promise((resolveExit) => server.once('exit', resolveExit));
                }
            }
        },
        { scope: 'worker' },
    ],
    baseURL: async ({ workerServer }, use) => {
        await use(workerServer.url);
    },
    resetData: [
        async ({ request, workerServer }, use) => {
            // A deployed environment is never reset unless the run opts in (CI containers started with ENABLE_TEST_RESET).
            if (workerServer.external && !process.env.ALLOW_TEST_RESET) {
                await use();
                return;
            }
            const response = await request.post('/api/test/reset');
            expect(response.status(), 'test reset endpoint must be enabled').toBe(204);
            await use();
        },
        { auto: true }, //Executes the reset automatically before each test
    ],
    dashboardPage: async ({ page, resetData: _ }, use) => {
        const dashboardPage = new DashboardPage(page);
        await dashboardPage.goto();
        await use(dashboardPage);
    },
});

export { expect };
