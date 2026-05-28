# Alternate Dockerfiles

These are drop-in replacements for `runner/Dockerfile`. The default
(`node-pnpm-wrangler.dockerfile`) is what `runner/Dockerfile` already
contains — kept here so you can compare all variants side-by-side.

| File | Best for | Image size | Suggested instance type |
|---|---|---|---|
| `node-pnpm-wrangler.dockerfile` | CF Workers deploys, Node monorepos | ~800-1000 MB | `standard-1` / `standard-2` |
| `node-only.dockerfile` | Lean Node tests, no CF deploy | ~550-700 MB | `lite` / `basic` |
| `php-postgresql.dockerfile` | Laravel, Symfony | ~1.4-1.6 GB | `standard-2` / `standard-3` |
| `php-mysql.dockerfile` | WordPress, legacy PHP | ~1.5-1.7 GB | `standard-2` / `standard-3` |
| `elixir-phoenix-postgres.dockerfile` | Phoenix, Ecto | ~1.3-1.5 GB | `standard-2` / `standard-3` |
| `playwright.dockerfile` | Browser E2E tests | ~1.1-1.3 GB | `standard-2` / `standard-3` |

## How to swap one in

1. Copy the variant you want over `runner/Dockerfile`:

   ```bash
   cp examples/dockerfiles/php-postgresql.dockerfile runner/Dockerfile
   ```

2. Update `runner/wrangler.jsonc` `instance_type` if needed (see the
   table above):

   ```jsonc
   "instance_type": "standard-3",
   ```

3. Re-deploy:

   ```bash
   cd runner && pnpm exec wrangler deploy
   ```

The first deploy after changing the Dockerfile re-uploads the image
(can take a few minutes — Cloudflare's registry layers don't always
hit). Subsequent deploys with the same Dockerfile are fast.

## How to write your own variant

Start from `node-only.dockerfile` (smallest base) and add your stack on
top. Every variant needs the same three things at the end:

1. Install the GitHub Actions runner binary (`actions/runner` from
   GitHub releases) into `/home/runner/`.
2. Run `installdependencies.sh` as root, then drop back to `runner`.
3. Copy `entrypoint.sh` (which `exec`s the runner with the JIT
   config passed via `RUNNER_JITCONFIG` env var, set by the Worker).

The pre-installed Node lives at `/opt/hostedtoolcache` (mirroring
GitHub-hosted runner layout) so `actions/setup-node@v4` finds it and
skips the download. Set `RUNNER_TOOL_CACHE` accordingly.

See [`../../docs/customization.md`](../../docs/customization.md) for
detailed how-to recipes (add Python, add Ruby, add system packages,
etc.).
