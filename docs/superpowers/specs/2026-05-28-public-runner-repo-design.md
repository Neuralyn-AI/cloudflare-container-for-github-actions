# Public OSS Repo: Cloudflare Container for GitHub Actions — Design

**Status:** Draft, awaiting approval
**Owner:** andresa
**Date:** 2026-05-28

## Goal

Publish a sanitized, well-documented version of the `neuralyn-ci-runner` Worker + Container as an open-source project at `Neuralyn-AI/cloudflare-container-for-github-actions`, so other teams can adopt the same self-hosted-runners-on-Cloudflare-Containers pattern to cut their GitHub Actions billing.

The repo provides:

1. The runner (Worker + default Dockerfile) ready to deploy.
2. A small library of alternative Dockerfiles for common stacks.
3. A small library of workflow examples (basic, advanced, notifications).
4. Documentation covering why this exists, how to set it up on both sides (Cloudflare + GitHub), how to customize, and a cost comparison vs GitHub-hosted runners.

## Background — why this project

GitHub Actions bills hosted runners by wall-clock minutes (paid even if the job is idle waiting on I/O) and only the `standard` 2-core tier counts toward the free monthly minutes — `larger runners` always cost real money. For high-traffic CI/CD pipelines (especially monorepos with matrix builds) the bill grows fast.

GitHub Actions does **not** bill `runs-on: self-hosted` jobs. If you can spin up an ephemeral runner per job somewhere cheaper, you keep all the GitHub Actions features (matrix, reusable workflows, environments, etc.) without paying their compute price.

Cloudflare Containers is the cheaper "somewhere" here: scale-to-zero, per-second billing for memory/disk while awake, per-second billing for actual CPU used (since 2025-11), and a generous monthly free tier baked into the Workers Paid plan ($5/month). Combined: a self-hosted runner that costs cents to dollars per month instead of dozens of dollars.

## Non-goals

- Replacing GitHub Actions itself. The runner stays in the GitHub Actions ecosystem and uses workflows, matrices, secrets, etc. exactly as before. Only the compute is swapped.
- Production-grade observability stack out of the box (dashboards, alerting). The Worker logs to Cloudflare Logs; users wire up alerts as they see fit. We ship a small `notify-webhook.yml` example and link to `Workers Logs` for those who want more.
- Multi-cloud abstraction. This project is Cloudflare Containers-specific. Porting to Fly.io / AWS Fargate / etc. is out of scope.
- Fully managed SaaS offering. This is a self-hosted-by-you tool — you deploy the Worker into your own Cloudflare account.
- A general-purpose CI platform. Just runners. The pipeline logic stays in your `.github/workflows/`.

## High-level structure

```
cloudflare-container-for-github-actions/
├── README.md                # Hero + why + cost table + setup overview + links
├── LICENSE                  # MIT
├── runner/                  # Deployable Worker + default container image
│   ├── Dockerfile           # Default: Node + pnpm + wrangler + actions-runner
│   ├── entrypoint.sh
│   ├── wrangler.jsonc       # name: neuralyn-github-container-runner
│   ├── package.json, tsconfig.json, vitest.config.ts
│   ├── src/                 # 5 files, ~273 LOC (copied + sanitized from source)
│   ├── test/                # 3 test files + fixtures
│   └── README.md            # Detailed deployment: GH App, wrangler secrets
├── examples/
│   ├── dockerfiles/         # 6 alternative images + README explaining each
│   │   ├── node-pnpm-wrangler.dockerfile     # = copy of runner/Dockerfile, kept for reference
│   │   ├── node-only.dockerfile              # smaller (no wrangler, no CF deploy)
│   │   ├── php-postgresql.dockerfile         # Laravel-style: PHP 8.x + Postgres 16
│   │   ├── php-mysql.dockerfile              # WordPress-style: PHP 8.x + MySQL 8
│   │   ├── elixir-phoenix-postgres.dockerfile
│   │   └── playwright.dockerfile             # Node + Chromium for E2E
│   └── workflows/           # 9 standalone workflow examples + README
│       ├── pr-check-node.yml                 # typecheck + tests + lint on PR
│       ├── pr-check-laravel.yml              # pint + phpstan + migrations + phpunit
│       ├── pr-check-issue-on-failure.yml     # creates a GH issue when checks fail
│       ├── pr-check-claude-fix.yml           # invokes Claude Code action to fix PR
│       ├── deploy-worker-simple.yml          # wrangler deploy on push to main
│       ├── deploy-worker-with-validation.yml # bindings check + dry-run + deploy
│       ├── deploy-wave-matrix.yml            # monorepo: multiple Workers in waves
│       ├── notify-webhook.yml                # generic HMAC webhook on success/failure
│       └── notify-pushover.yml               # Pushover notification on failure
└── docs/
    ├── customization.md     # How to add/remove deps in the Dockerfile + cookbook
    ├── instance-types.md    # When to upgrade tier + link to CF docs
    └── architecture.md      # Worker + Container + JIT runner glue, ASCII diagram
```

## Components

### `runner/` — the deployable

Direct copy of the working runner from `cloudflare-deploy-github-actions/runner/`, sanitized:

- **Worker name:** `neuralyn-ci-runner` → `neuralyn-github-container-runner` (in `wrangler.jsonc`)
- **Org references:** `Neuralyn-AI` → `<your-org>` placeholders in README and any code paths
- **Default Dockerfile:** Node 24 + pnpm + wrangler + git + jq + sudo + libicu74 + actions-runner v2.334.0 (no PHP, no Postgres — those move to `examples/dockerfiles/`). The current source Dockerfile bundles all of these; the public version strips it down to the minimum viable and points users to the examples for additions.
- **Source code:** copy verbatim. No Neuralyn-specific logic in `src/` — the Worker is generic (verify HMAC, decode `workflow_job/queued`, mint installation token, request JIT config, start container with it). The 5 src files map cleanly to: `index.ts` (fetch handler), `hmac.ts`, `github-app.ts` (JWT + installation token + JIT config), `container.ts` (Durable Object glue), `webhook-filter.ts`, `types.ts`.
- **Tests:** copy verbatim. Vitest + Worker pool. No Neuralyn-specific fixtures.

### `examples/dockerfiles/` — 6 variants

Each is a standalone Dockerfile that follows the same shape as the default but adds/swaps the runtime layer. Each has top-of-file comments explaining:
- What stack it targets
- Approximate image size
- Which `instance_type` it pairs with (RAM/disk requirements)
- How to swap it in (rename to `runner/Dockerfile`, re-deploy)

The `node-pnpm-wrangler.dockerfile` is byte-identical to `runner/Dockerfile`, kept here so the "I want to see all options side-by-side" use case is satisfied without users having to dig into `runner/`.

### `examples/workflows/` — 9 standalone YAMLs

Each workflow is **self-contained** (no `uses:` of internal Neuralyn reusables, no composite-action dependencies). The goal is copy-paste: a user adds the workflow to their `.github/workflows/`, swaps `runs-on: [self-hosted, cf-container]` for their runner labels if needed, and adapts the steps.

Each workflow's first comment block explains:
- What it does
- Which secrets it needs (e.g. `CLOUDFLARE_API_TOKEN`)
- What permissions block it requires
- Any prerequisites (e.g. "this assumes your Worker labels the runner with `cf-container`")

### `docs/`

Three focused docs, not a docs site:

- **`customization.md`** — cookbook style: "How do I add Python?" → "Add these lines to the Dockerfile". Covers the common additions (Python, Go, Ruby, Postgres, MySQL, Chromium, custom apt packages, custom tool cache directories).
- **`instance-types.md`** — table of the 6 CF instance types with vCPU/RAM/disk, when each is appropriate (e.g. "use `standard-1` for typical Node test suites; `standard-3` if you need MySQL + Node in the same container"), and a link to Cloudflare's official Containers types page so users get the canonical reference.
- **`architecture.md`** — one-page explanation with an ASCII diagram of webhook → Worker → DO → container → JIT runner → GitHub. Useful for contributors and curious users.

### README structure

1. **Hero paragraph** (~80 words) — what the project is and why it exists (cut GH Actions billing).
2. **Why it's cheaper** (~150 words) — GH doesn't charge for self-hosted; CF bills only real usage; per-second granularity; scale to zero.
3. **Cost comparison table** — see Decisions §1 below for exact format.
4. **Architecture** — one paragraph + tiny ASCII diagram (link to `docs/architecture.md` for detail).
5. **Quick setup** — bullet list with one-liner per step + link to `runner/README.md` for the full walkthrough.
6. **Customization** — links to `docs/customization.md` and `docs/instance-types.md`.
7. **Examples** — link to `examples/`, with one sentence per workflow/Dockerfile.
8. **Contributing & License** — short.

## Decisions

1. **Cost comparison table format = the one from the user's screenshot.** Columns: CF type · vCPU/RAM · CF full price (10k min, range from idle to 100% CPU) · GitHub runner equivalent (lowest tier with matching vCPU) · GitHub price (10k min) · Savings (range %). Footer text explains why the savings figure is a range and not a single number: it depends on actual CPU utilization, and that the GH equivalent matches by vCPU (not RAM) because GitHub's larger runners come in fixed vCPU tiers.
2. **License = MIT.** Most permissive standard for infra utilities; no patent grant complexity.
3. **GitHub org = `Neuralyn-AI`.** Final repo path: `Neuralyn-AI/cloudflare-container-for-github-actions`. Local path: `/Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions`.
4. **Default Dockerfile = Node + pnpm + wrangler.** Covers the largest fraction of CF Workers users without bloating the image. Other stacks are documented in `examples/dockerfiles/` with explicit instructions on how to swap them in.
5. **Worker default `instance_type` = `standard-2`.** Smaller default than the source repo's `standard-3` to keep the free-tier window wider for new adopters; `docs/instance-types.md` explains when to bump up.
6. **Workflow examples written from scratch, not copied.** The source repo's workflows reference internal Neuralyn pieces (`alert-hub`, `@neuralyn/shared`, internal reusables). Cleaner to write standalone copy-paste examples than to try to sanitize the existing ones.
7. **No multi-language Dockerfile variant.** Per the user choice during brainstorming — niche and complicated. The customization doc explains how to add additional runtimes for users who really need them.
8. **`docs/superpowers/` stays in the public repo.** Specs (this file) and any subsequent ADRs ship as part of the repo. Helps contributors understand decisions; standard practice for OSS infra projects.

## Sanitization checklist (applied while copying source)

- [ ] `wrangler.jsonc` name → `neuralyn-github-container-runner`
- [ ] All `Neuralyn-AI` references → `<your-org>` placeholders (README, docs)
- [ ] Translate `cloudflare-deploy-github-actions/README.md` content if anything reused → English
- [ ] Drop `actions/notify-alert-hub` composite action — replace usage with generic HMAC webhook in `notify-webhook.yml`
- [ ] Drop `claude.yml` internal workflow; the public-facing `pr-check-claude-fix.yml` is a standalone, sanitized example
- [ ] Drop references to `@neuralyn/shared` package
- [ ] Drop internal postmortems (`docs/superpowers/postmortems/`)
- [ ] Drop any `tryon-workers` / `tryon-laravel` specific paths in comments

## Cost comparison table — exact content for README

Reproduced from the user-provided screenshot of an earlier billing discussion. The savings column is a range because CF cost varies with CPU utilization (per-second active billing) while GH cost is flat wall-clock. Footnote explains the methodology.

| CF type | vCPU / RAM | CF full price (10k min) | GH equivalent | GH price | Savings vs GH† |
|---|---|---|---|---|---|
| `lite` | 1/16 / 0.25 GiB | $0.46 – $1.21 | 1-core slim | $20 | **94% – 98%** |
| `basic` | 1/4 / 1 GiB | $1.67 – $4.67 | 1-core slim | $20 | **77% – 92%** |
| `standard-1` | 1/2 / 4 GiB | $6.34 – $12.34 | 1-core slim | $20 | **38% – 68%** |
| `standard-2` | 1 / 6 GiB | $9.50 – $21.50 | 1-core slim | $20 | **−8% – 53%** |
| `standard-3` | 2 / 8 GiB | $12.67 – $36.67 | 2-core | $60 | **39% – 79%** |
| `standard-4` | 4 / 12 GiB | $18.84 – $66.84 | 4-core | $120 | **44% – 84%** |

† Range is `(GH − CF) / GH`, where the **low end** of CF cost = 0% CPU utilization (only memory + disk billed while awake) and **high end** = 100% CPU utilization (memory + disk + full vCPU-seconds). The single negative figure (`standard-2 @ 100% CPU = −8%`) is an artifact: at saturation, CF's `standard-2` (6 GiB RAM) is over-provisioned for what GitHub's slim 1-core (~4 GiB) offers, so the apples-to-apples comparison flips. Anything below ~85% utilization on `standard-2` is still cheaper than the GH slim.

## File structure inventory (final count)

- `runner/` — 8 top-level files + `src/` (6 files) + `test/` (3 files + fixtures dir) = ~18 files
- `examples/dockerfiles/` — 6 Dockerfiles + 1 README = 7 files
- `examples/workflows/` — 9 YAMLs + 1 README = 10 files
- `docs/` — 3 markdown files + the spec itself = 4 files
- Root — `README.md`, `LICENSE`, `.gitignore` = 3 files

Total: ~42 files in the initial commit.

## Testing strategy

- The Worker tests (vitest + `@cloudflare/vitest-pool-workers`) come over verbatim from the source repo. They cover HMAC, GitHub App JWT, webhook filter. No new tests needed for the public release — the code is unchanged.
- Documentation tested by **dogfooding**: deploy the public Worker into a throwaway Cloudflare account using only the public README, with no shortcuts from prior knowledge. If any step is unclear, fix the doc, then redeploy.
- Workflow examples lint-tested with `actionlint` locally (and `python3 -c "import yaml; yaml.safe_load(open(f))"` for plain YAML validity).
- Dockerfile variants lint-tested with `hadolint`. Build is verified locally with `docker build --platform=linux/amd64 -t test .` for each variant before commit. Image size measured (`docker image ls`) and recorded in the file header comments.

## Risks

1. **Stale tracking with source repo.** The internal `cloudflare-deploy-github-actions` will keep evolving. Public repo will drift. Mitigation: explicit policy that public repo is a **fork point**, not a downstream — they live independently after the initial publish. We backport fixes manually when we find time.
2. **License footguns.** Pulling in the `actions-runner` binary (GitHub's, downloaded at container build time) is fine — it's distributed under their EULA, not redistributed by us. Worth a one-line note in the Dockerfile comment.
3. **Cost table accuracy.** Cloudflare prices change. The footnote dates the figures and references the official Cloudflare Containers pricing page so readers can verify currency. We don't promise the table is always current.
4. **GitHub App setup complexity.** The biggest friction for first-time adopters is the GH App creation + PKCS#1 → PKCS#8 conversion. Mitigation: extremely explicit step-by-step in `runner/README.md` with screenshots is **out of scope** for the initial release (text-only docs are enough), but we leave a clear path to add them later.
5. **Cloudflare Containers is still in beta.** Pricing model and feature set may change. The README acknowledges this and dates the cost figures (`Last verified: 2026-05-28`).

## Out of scope

- Auto-update mechanism for the runner image (e.g. on new actions-runner releases). Users pin their own version.
- Per-job container labeling beyond `[self-hosted, cf-container]`. If users need separate pools, they deploy multiple Workers.
- A web dashboard / UI. Cloudflare's own Logs + Workers Analytics is the dashboard.
- Cost calculator. The table is enough; users curious about their specific scenario can plug into a spreadsheet.

## Migration

1. Initialize the new repo locally (already done in the brainstorming step).
2. Implement the file structure per this spec (covered by the implementation plan).
3. Test the Worker deploys end-to-end into a throwaway Cloudflare account using only the public docs.
4. Push to `Neuralyn-AI/cloudflare-container-for-github-actions`.
5. Tag `v0.1.0`, write a short release note.
6. Announce in `Neuralyn-AI/cloudflare-deploy-github-actions` README footer ("public version available at: …"). Do not delete the internal repo; it keeps internal-only workflows (`alert-hub`, `claude.yml`, etc.).

## Open questions (for review)

None at this point — all decisions made above. If review surfaces gaps, they get added inline.
