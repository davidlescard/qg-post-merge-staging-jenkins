import { expect, type Locator } from '@playwright/test';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactText = (text: string) => new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`);

export class Grid<C extends string> {
    constructor(
        readonly root: Locator,
        readonly columns: readonly C[],
    ) {}

    get headerCells(): Locator {
        return this.root.getByRole('columnheader');
    }

    get rows(): Locator {
        return this.root.locator('tbody').getByRole('row');
    }

    private colIndex(col: C): number {
        const index = this.columns.indexOf(col);
        if (index < 0) throw new Error(`Unknown column "${col}". Known columns: ${this.columns.join(', ')}`);
        return index;
    }

    getHeader(col: C): Locator {
        return this.headerCells.nth(this.colIndex(col));
    }

    // :nth-child is the only way to select one column across all rows in a single locator.
    getColumn(col: C): Locator {
        return this.rows.locator(`td:nth-child(${this.colIndex(col) + 1})`);
    }

    /** Number rows are 1-based and exclude the header. String rows match exactly and return the first hit. */
    getRow(row: number | string, refColumn?: C): Locator {
        if (typeof row === 'number') {
            if (row < 1) throw new Error(`Row numbers are 1-based, received ${row}`);
            return this.rows.nth(row - 1);
        }
        const cells = this.root.page().getByRole('cell');
        const match = refColumn ? cells.nth(this.colIndex(refColumn)) : cells;
        return this.rows.filter({ has: match.filter({ hasText: exactText(row) }) }).first();
    }

    getCell(col: C, row: number | string, refColumn?: C): Locator {
        return this.getRow(row, refColumn).getByRole('cell').nth(this.colIndex(col));
    }

    async clickHeader(col: C): Promise<void> {
        await this.clickInteractive(this.getHeader(col));
    }

    async clickCell(col: C, row: number | string, refColumn?: C): Promise<void> {
        await this.clickInteractive(this.getCell(col, row, refColumn));
    }

    // Reads do not auto-wait, so assert that the rows exist before scraping.
    async getColumnValues(col: C): Promise<string[]> {
        return trimAll(await this.getColumn(col).allInnerTexts());
    }

    async getRowValues(row: number | string, refColumn?: C): Promise<string[]> {
        return trimAll(await this.getRow(row, refColumn).getByRole('cell').allInnerTexts());
    }

    async getAllRows(): Promise<Record<C, string>[]> {
        const count = await this.rows.count();
        const result: Record<C, string>[] = [];
        for (let i = 0; i < count; i++) {
            const values = trimAll(await this.rows.nth(i).getByRole('cell').allInnerTexts());
            result.push(Object.fromEntries(this.columns.map((c, j) => [c, values[j] ?? ''])) as Record<C, string>);
        }
        return result;
    }

    async rowCount(): Promise<number> {
        return this.rows.count();
    }

    async verifyColumns(): Promise<void> {
        await expect(this.headerCells).toHaveText([...this.columns]);
    }

    // Prefer the link or button inside the target; fall back to the target itself.
    // count() does not auto-wait, so wait for the target before deciding what to click.
    private async clickInteractive(target: Locator): Promise<void> {
        await target.waitFor();
        const inner = target.getByRole('link').or(target.getByRole('button')).first();
        await ((await inner.count()) > 0 ? inner : target).click();
    }
}

const trimAll = (values: string[]) => values.map((value) => value.trim());
