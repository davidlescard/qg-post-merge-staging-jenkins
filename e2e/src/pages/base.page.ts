import { type Locator, type Page } from '@playwright/test';

export abstract class BasePage {
    readonly homeLink: Locator;

    constructor(protected readonly page: Page) {
        this.homeLink = page.getByRole('link', { name: 'Release Quality Dashboard' });
    }

    async goHome() {
        await this.homeLink.click();
    }
}
