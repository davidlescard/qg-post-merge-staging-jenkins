import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '@pages/base.page';
import { type RunStatus } from '@pages/dashboard.page';

export class RunDetailPage extends BasePage {
    readonly heading: Locator;
    readonly statusSelect: Locator;

    constructor(page: Page) {
        super(page);
        // Other h2 headings from the list page are briefly present during navigation, so role alone is ambiguous.
        this.heading = page.locator('#detail-heading');
        this.statusSelect = page.getByRole('combobox', { name: 'Update status', exact: true });
    }

    async setStatus(status: RunStatus) {
        await this.statusSelect.selectOption(status);
    }
}
