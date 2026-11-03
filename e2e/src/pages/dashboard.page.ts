import { type Locator, type Page } from '@playwright/test';
import { Grid } from '@components/grid.comp';
import { BasePage } from '@pages/base.page';

export const RUN_COLUMNS = ['Name', 'Branch', 'Status', 'Duration (s)'] as const;
export type RunStatus = 'queued' | 'running' | 'passed' | 'failed';

export class DashboardPage extends BasePage {
    readonly heading: Locator;
    readonly rows: Locator;
    readonly runsTable: Grid<(typeof RUN_COLUMNS)[number]>;
    readonly searchInput: Locator;
    readonly statusFilter: Locator;
    readonly nameInput: Locator;
    readonly branchInput: Locator;
    readonly notesInput: Locator;
    readonly createRunButton: Locator;
    readonly createdMessage: Locator;
    readonly errorAlert: Locator;
    readonly retryButton: Locator;
    readonly emptyMessage: Locator;

    constructor(page: Page) {
        super(page);
        this.heading = page.getByRole('heading', { name: 'Release Quality Dashboard' });
        this.rows = page.getByRole('table').getByRole('row');
        this.runsTable = new Grid(page.getByRole('table', { name: 'Test runs' }), RUN_COLUMNS);
        this.searchInput = page.getByLabel('Search runs');
        this.statusFilter = page.getByRole('combobox', { name: 'Status', exact: true });
        this.nameInput = page.getByLabel('Name', { exact: true });
        this.branchInput = page.getByLabel('Branch', { exact: true });
        this.notesInput = page.getByLabel('Notes', { exact: true });
        this.createRunButton = page.getByRole('button', { name: 'Create run' });
        this.createdMessage = page.getByRole('status').filter({ hasText: 'Created run' });
        this.errorAlert = page.getByRole('alert');
        this.retryButton = page.getByRole('button', { name: 'Retry' });
        this.emptyMessage = page.getByText('No test runs match your filters.');
    }

    async goto() {
        await this.page.goto('/');
    }

    runLink(name: string) {
        return this.page.getByRole('link', { name });
    }

    async filterByStatus(status: RunStatus) {
        await this.statusFilter.selectOption(status);
    }

    async createRun(run: { name: string; branch: string; notes?: string }) {
        await this.nameInput.fill(run.name);
        await this.branchInput.fill(run.branch);
        if (run.notes) await this.notesInput.fill(run.notes);
        await this.createRunButton.click();
    }
}