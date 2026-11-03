import { test, expect } from '@fixtures/baseTest';

test.describe('deployed API', { tag: '@post-deploy' }, () => {
    test('health endpoints report ok', async ({ request }) => {
        for (const path of ['/health', '/api/health']) {
            const response = await request.get(path);
            expect(response, path).toBeOK();
            expect(await response.json()).toEqual({ status: 'ok' });
        }
    });

    test('lists runs', async ({ request }) => {
        const response = await request.get('/api/runs');
        expect(response).toBeOK();
        expect((await response.json()).length).toBeGreaterThan(0);
    });

    test('does not expose the test reset endpoint', async ({ request }) => {
        test.skip(!process.env.BASE_URL, 'Local test servers enable the reset endpoint on purpose.');
        expect((await request.post('/api/test/reset')).status()).toBe(404);
    });
});
