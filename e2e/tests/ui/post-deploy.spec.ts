import { test, expect } from '@fixtures/baseTest';

test('the deployed dashboard renders its runs', { tag: '@post-deploy' }, async ({ dashboardPage }) => {
    await expect(dashboardPage.heading).toBeVisible();
    await dashboardPage.runsTable.verifyColumns();
    await expect(dashboardPage.rows.nth(1)).toBeVisible(); // header row plus at least one run
});
