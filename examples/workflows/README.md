# Workflow examples

All workflows here are **standalone** — they don't `uses:` any internal
reusable workflows or composite actions. Copy a file into your repo's
`.github/workflows/` and adapt the steps to your stack.

Every workflow assumes `runs-on: [self-hosted, cf-container]`, which is
the default label set by `runner/wrangler.jsonc`. If you changed the
label scheme, edit the `runs-on:` lines accordingly.

## Available examples

| File | Purpose | Trigger |
|---|---|---|
| `pr-check-node.yml` | Typecheck + tests + lint for a Node project | pull_request |
| `pr-check-laravel.yml` | Pint + PHPStan + migrations + PHPUnit (Laravel) | pull_request |
| `pr-check-issue-on-failure.yml` | Test; open a tracking issue if tests fail | pull_request |
| `pr-check-claude-fix.yml` | Test; invoke Claude Code to push a fix commit on failure | pull_request |
| `deploy-worker-simple.yml` | `wrangler deploy` on push to main | push |
| `deploy-worker-with-validation.yml` | Bindings check + dry-run + deploy | push |
| `deploy-wave-matrix.yml` | Deploy multiple Workers in 3 sequential waves | push |
| `notify-webhook.yml` | POST HMAC-signed JSON to a webhook on success/failure | push |
| `notify-pushover.yml` | Send Pushover push notification on deploy failure | push |

## Conventions

- **`runs-on: [self-hosted, cf-container]`** — the labels the Worker
  registers JIT runners with. Override if you changed the Worker.
- **Secrets** — listed in each workflow's header comment. Add them in
  `Settings → Secrets and variables → Actions` of the consuming repo.
- **Comment headers** — first 5-15 lines of each workflow describe
  what it does, secrets needed, and prerequisites. Read before copying.

## Adapting a workflow

1. Copy the file to your repo's `.github/workflows/`.
2. Read the header comment for any prerequisite (e.g. composer.json,
   wrangler.jsonc, specific scripts).
3. Adjust the `runs-on:` labels if you changed them in `wrangler.jsonc`.
4. Add the required secrets in your repo settings.
5. Commit and push — the workflow runs on the next matching trigger.

## Combining workflows

You can copy multiple workflows into the same repo — they'll run
independently. The `report-*` jobs (issue on failure, Pushover on
failure) can also be lifted out and reused across pipelines: just
update their `needs:` to point at whatever job they should react to.
