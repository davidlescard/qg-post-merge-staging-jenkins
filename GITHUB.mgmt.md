# GitHub setup and management

A checklist and reference for putting a project like these onto GitHub with a pull-request gate that actually blocks merges. It collects what came up while setting up the Quality Gate Lab projects.

## Quick reference

| Project | Workflow file | Job (check) name |
|---|---|---|
| `qg-pr-open-container-playwright` | `.github/workflows/pr-open-container.yml` | `e2e-container` |
| `qg-pr-open-e2e-playwright` | `.github/workflows/pr-open-source.yml` | `e2e-source` |
| `ai-ci-reference-dashboard` (monorepo) | `.github/workflows/pr-quality-gate.yml` | `e2e-smoke` and `docker-image` |

The **check name is the job's `name:` field**, and that is what the ruleset requires.

## Order of operations for a new project

1. Create an empty repo on GitHub.
2. Set up authentication and your Git identity.
3. Commit and push `main`.
4. Review the repository's Actions settings.
5. Open a first PR so the workflow runs once.
6. Create the branch ruleset and add the check that now exists.
7. Prove the gate blocks a merge with a deliberate failure.

## 1. Create the repo

- On github.com, **New repository**. Create it **empty**: no README, licence or `.gitignore`, so the first push does not conflict.
- **Public or private:** check your plan. Private repos draw on a monthly allowance of Actions minutes, and some ruleset features can depend on the plan. If an option is greyed out, that is the likely reason.
- The `gh` CLI can create repos from the terminal (`gh repo create`), but it is optional and was not installed on this machine.

## 2. Authenticate

GitHub does not accept your account password for Git. This machine uses **Git Credential Manager** (`credential.helper = manager`), which caches whatever credential it last used.

| Option | How | Notes |
|---|---|---|
| Browser sign-in (simplest) | Clear the cache, then `git push`; a browser window opens | Grants the access needed to push, including workflow files |
| Fine-grained token | Settings, Developer settings, Personal access tokens, Fine-grained tokens | Needs **Contents: Read and write** and **Workflows: Read and write**. Repository access decides *which repos*, permissions decide *what it can do* |
| Classic token | Same area, Tokens (classic) | Tick `repo` and `workflow`. Broad: short expiry, delete when done |
| SSH | `git remote set-url origin git@github.com:<user>/<repo>.git` | Needs a key registered with GitHub |

Clear a stale or wrong cached credential before every retry:

```
printf "protocol=https\nhost=github.com\n\n" | git credential reject
```

You can also delete the `git:https://github.com` entries in **Windows Credential Manager**.

Rules for tokens:
- Never commit one, and never paste one into chat, issues or screenshots.
- Use a separate token per purpose. The read-only token in `jenkins/.env` is for Jenkins reading branches and PRs. Do not reuse it to push.
- Set an expiry, and delete a token that leaks.
- To see what is in use: **Settings, Developer settings, Personal access tokens** shows each token's last-used time, and **Settings, Applications, Authorized OAuth Apps** shows Git Credential Manager's sign-in.

## 3. Git identity, line endings and file modes

- **Identity:** commits need `user.name` and `user.email`. Git Bash and WSL have **separate** Git configs, so a commit from WSL can fail with "Author identity unknown" even though Git Bash works. Set it where you commit:
  ```
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```
  Use GitHub's private address (`<id>+<user>@users.noreply.github.com`) if you keep your email private. Committing from one environment consistently also avoids files that look modified because of mode and line-ending differences.
- **Executable bit:** `build.sh` must be committed as executable, or the Linux runner fails with "Permission denied". A fresh `git init` on Windows can record it as non-executable:
  ```
  git add --chmod=+x build.sh
  git ls-files -s build.sh        # should start with 100755
  ```
- **Line endings:** keep `.gitattributes` with `* text=auto` and `eol=lf` for config and source files. Add `*.sh text eol=lf` too, because a shell script with CRLF endings fails on Linux with "bad interpreter".
- **Lockfile:** commit `pnpm-lock.yaml`. CI installs with `--frozen-lockfile` and fails if it is out of date.

## 4. First push, or redirecting an existing project

```
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

The workflows trigger on `pull_request`, so **pushing to `main` does not run them**. Only a PR does.

To point a copied project (which still carries the old repo's `.git`) at a new repo:
- **A. Keep the history:** `git remote set-url origin <new-url>`, `git branch -M main`, `git push -u origin main`. The old commits come along.
- **B. Start fresh (cleaner for a trimmed copy):**
  ```
  rm -rf .git
  git init -b main
  git add --chmod=+x build.sh
  git add -A
  git commit -m "Initial commit"
  git remote add origin <new-url>
  git push -u origin main
  ```
- Delete leftovers such as `e2e/playwright.config.ts.ORIG` first, and check that no `.env` is staged.

## 5. Repository settings to review

Under **Settings** in the repo (labels can differ slightly between GitHub UI versions):

- **General, Default branch:** `main`.
- **General, Pull Requests:** consider **Automatically delete head branches** after merge.
- **Actions, General, Actions permissions:** allow actions. Allowing GitHub-authored actions plus the ones you list is stricter.
- **Actions, General, Workflow permissions:** read-only. The workflows already declare `permissions: contents: read`, which is the safer default to keep.
- **Actions, General, Fork pull request workflows:** for a public repo, require approval for first-time contributors.
- **Actions, General, Artifact and log retention:** a repo-wide cap on how long artifacts are kept. Our workflows ask for 7 days (`retention-days: 7`).
- **Secrets and variables, Actions:** none are needed for these flows.

## 6. Branch ruleset (blocks merges to `main`)

Create it only after the workflow has run once, because the **Add checks** search lists only checks GitHub has already seen in this repo.

1. Open the repo on github.com, then **Settings**, **Rules**, **Rulesets**, **New ruleset**, **New branch ruleset**.
2. **Ruleset name:** anything, such as `protect-main`.
3. **Enforcement status:** **Active**. "Evaluate" only logs and blocks nothing, and "Disabled" does nothing.
4. **Bypass list:** leave it empty. Nobody listed means admins cannot skip the rules.
5. **Target branches:** **Add target**, then **Include default branch** (or `main` by pattern).
6. **Rules:** tick **Require status checks to pass**, click **Add checks**, and pick the check for the project, correponding to "jobs" within the workflow yml files (i.e. `e2e-container`, `e2e-source`, or `e2e-smoke` and `docker-image`).
7. Optionally tick **Require a pull request before merging**, **Block force pushes**, and **Require branches to be up to date before merging** (the last one causes re-runs after other merges). Then **Create**.

Gotchas seen so far:
- **Active enforcement and a target that includes `main`** are the two settings that most often make a rule do nothing.
- **An enabled-but-not-green merge button** (for example one that needs a second click) means admins can bypass. In a ruleset, check the **bypass list**. In a classic branch protection rule, tick **Do not allow bypassing the above settings**.
- **Renaming a job's `name:`** leaves the old check stuck at "Expected, waiting for status" forever. Update the ruleset when you rename a job.
- **Path filters** on a workflow (`paths:`) mean the check may never report for some PRs, and a required check that never reports blocks the merge. These workflows have none.
- **Two workflows with the same job name** cause an ambiguous check. Keep names unique.
- **Jenkins results** are not shown in GitHub unless its token can write commit statuses, so a Jenkins build is not a required check by default.

## 7. Prove the gate works

1. Branch from `main`: `git checkout -b demo/failing-gate`.
2. Make a smoke test fail. For example, in `e2e/tests/ui/z_.failure-demo.spec.ts`, change `test.skip(` to `test(` and add `{ tag: '@smoke' }` so the smoke run includes it.
3. Push and open a PR to `main`.
4. Expect: the required check turns red, the merge button is disabled, and the run's **Artifacts** section has the report and traces.
5. Close the PR without merging, and delete the branch.

## 8. Artifacts

- After a run, open the repo's **Actions** tab, click the run, and scroll to **Artifacts** on the summary page.
- Artifacts expire after the retention period. After that the download link fails with "Failed to generate URL to download artifact". The download is also unavailable if you are not signed in with access to the repo.
- Each job's artifact needs a unique `name:` within one run (the monorepo uses `playwright-diagnostics` and `playwright-diagnostics-container`).

## 9. Keeping workflows healthy

- **Pin action versions** (`@v7`). A full commit SHA is stricter than a moving major tag.
- **Dependabot:** a `.github/dependabot.yml` with the `github-actions` ecosystem raises PRs for new action versions.
- **Runner images:** `ubuntu-latest` can move to a newer Ubuntu release. GitHub posts a notice in the run's annotations before it does.
- **Action order matters:** `pnpm/action-setup` runs before `actions/setup-node` because the pnpm cache setup needs pnpm already installed.
- **Concurrency:** the workflows cancel an older run when a PR gets a new push, which saves minutes.

## 10. Troubleshooting

| Message or symptom | Meaning | Fix |
|---|---|---|
| `Password authentication is not supported` / `Invalid username or token` | A password or bad credential was sent | Browser sign-in or a token; clear the cache |
| `403 ... Permission to <repo> denied to <user>` | Authenticated, but that credential cannot write | Token lacks **Contents: Read and write**, is scoped to other repos, or an old cached credential is reused |
| `refusing to allow a Personal Access Token to create or update workflow` | The push includes `.github/workflows/*` | Add **Workflows: Read and write** (fine-grained) or the `workflow` scope (classic) |
| `Repository not found` (404) | Wrong name, or no access | Create the repo; check owner and name; check token access |
| `src refspec main does not match any` | No commit yet | Commit first |
| `Updates were rejected` (non-fast-forward) | The remote is not empty | Create it empty, or `git pull origin main --allow-unrelated-histories` |
| `Author identity unknown` | No `user.name` or `user.email` in this Git environment | Set them (Git Bash and WSL are separate) |
| `Permission denied` running `build.sh` in CI | Executable bit not committed | `git add --chmod=+x build.sh` |
| Workflow does not run | Pushed to `main`, or Actions disabled | Open a PR; check **Settings, Actions** |
| Required check stuck on "Expected" | Job renamed, or the workflow did not trigger | Update the ruleset or fix the trigger |
| Merge button enabled with a red check | Ruleset not active, wrong target, or admin bypass | Check enforcement status, target branches and bypass list |
| Artifact download fails | Expired, or not signed in | Re-run and download within the retention period |

## Checklist

- [ ] Empty repo created, default branch `main`
- [ ] Authentication works (`git push` succeeds)
- [ ] Identity set in the Git environment you commit from
- [ ] `build.sh` committed as `100755`, `pnpm-lock.yaml` committed, `.env` not staged
- [ ] Actions enabled, workflow permissions read-only
- [ ] First PR opened, workflow ran, artifact downloads
- [ ] Ruleset **Active**, target includes `main`, bypass list empty, required check added
- [ ] Deliberate failure blocks the merge
