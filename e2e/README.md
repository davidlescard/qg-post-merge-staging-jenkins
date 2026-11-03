# E2E tests

Playwright tests for the Release Quality Dashboard.

## Setup (once)

From the repo root:

```
./build.sh                     # installs dependencies and builds the app
pnpm exec playwright install chromium
```

The browser download is separate from `pnpm install`. CI needs the same install step.

The tests run the compiled app, so rebuild with `./build.sh build` after changing anything in `apps/`.

## Run the tests

From `e2e/` (or use `./build.sh e2e` from the root). Commands below use `pnpm exec`, which runs the locally installed Playwright:

| Goal | Command |
|---|---|
| Run everything | `pnpm exec playwright test` |
| One project | `pnpm exec playwright test --project=ui` |
| One file | `pnpm exec playwright test tests/ui/dashboard.spec.ts` |
| Tests matching a title | `pnpm exec playwright test -g "sorts by"` |
| Watch the browser | `pnpm exec playwright test --headed` |
| Step through with the inspector | `pnpm exec playwright test --debug` |
| Interactive UI mode | `pnpm exec playwright test --ui` |
| List tests without running | `pnpm exec playwright test --list` |
| Smoke suite only (PR gate) | `pnpm test:smoke` |
| Regression suite only | `pnpm test:regression` |
| API tests only | `pnpm test:api` |

Each Playwright worker starts its own app instance (`apps/api/dist/server.js`) on port 3100 plus the worker's index, with an in-memory database and `ENABLE_TEST_RESET=true`, and stops it when the worker finishes (see `src/fixtures/baseTest.ts`). Before every test the data is reset to the seed, so tests in parallel workers cannot affect each other.

## Reports and failures

```
pnpm exec playwright show-report     # opens the HTML report
pnpm exec playwright show-trace test-results/<test-folder>/trace.zip
```

- Screenshots and traces are saved in `test-results/` for every failed test (`trace: 'retain-on-failure'`).
- `test-results/junit.xml` is the machine-readable result for CI. `playwright-report/` is the HTML report.
- `playwright-report/` and `test-results/` are generated and git-ignored.

## Run against another environment

Set `BASE_URL` to skip starting a local server and target a deployed app:

```
BASE_URL=https://staging.example.com pnpm exec playwright test
```

A deployed app has no `/api/test/reset` endpoint, so only run tests that do not rely on seed data there.

## Environment variables

| Variable | Effect |
|---|---|
| `BASE_URL` | Target an already-running app instead of starting per-worker servers |
| `ALLOW_TEST_RESET` | With `BASE_URL`, still reset data before each test. Only for a test container started with `ENABLE_TEST_RESET=true`; run with `--workers=1` because all tests share one database |
| `CI` | Enables retries and `forbidOnly` |

## Layout

```
e2e/
  playwright.config.ts   shared config and projects
  tests/ui/              browser tests (project: ui)
  tests/api/             HTTP tests using the request fixture (project: api)
  src/fixtures/          custom test fixtures (@fixtures alias)
  src/pages/             page objects (@pages alias)
  src/components/        reusable UI components, for example Grid for tables (@components alias)
```

## Conventions

- Locate elements by role and accessible name, not CSS, unless there is no alternative.
- Page objects and components expose Locators and actions, and the specs keep the assertions.
- Fixed locators are `readonly` properties assigned in the constructor. Only lookups that need a runtime argument, such as `runLink(name)`, are methods.
- Use `await expect(locator)...` assertions, which retry. Scraping calls such as `allInnerTexts()` and `count()` do not wait, so assert first.
- Each test must be independent of order and of leftover data.
