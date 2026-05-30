# Cloudflare container for Github Actions

A self-hosted GitHub Actions runner that runs on **Cloudflare
Containers**, so your CI/CD compute bill stops growing with your team.
The runner stays inside the GitHub Actions ecosystem (workflows,
matrices, secrets, reusable workflows — all unchanged) but the actual
container that runs the job is yours, billed by Cloudflare at per-second
granularity instead of GitHub's per-minute wallclock.

This project exists because GitHub Actions billing for non-trivial CI
pipelines (matrix builds, monorepos, multi-stage deploys) gets expensive
fast — especially on `larger runners`, which never count toward the free
monthly minutes. Swapping to self-hosted runners on Cloudflare cuts that
bill by **40-98%** depending on your workload (see table below).

## Why it's cheaper

**GitHub Actions does not bill `runs-on: self-hosted` jobs.** You only
pay for the compute underneath. So the question becomes "where do I run
that compute cheapest?"

**Cloudflare Containers** wins because:

- **Per-second billing.** Memory + disk are charged for every second the
  container is awake (based on the provisioned instance size). CPU is
  charged only for actual vCPU-seconds burned (since 2025-11). GitHub
  bills the wallclock minute regardless of CPU usage.
- **Scale to zero.** Sleeping containers cost nothing. A typical CI
  runner is awake only during job execution — minutes per day instead
  of hours.
- **Generous monthly free tier.** The Workers Paid plan ($5/month)
  includes 25 GiB-hours of memory, 375 vCPU-minutes, 200 GB-hours of
  disk. For small-to-medium pipelines, this often means **$0 over the
  base $5**.

## Cost comparison

Reproduced from a billing-research session (Claude-assisted, methodology
in the footnote). Each row is **10,000 minutes of awake runner time per
month**. Savings is a range because CF cost varies with CPU utilization
(per-second active billing) while GH cost is flat wallclock.

| CF type | vCPU / RAM | CF full price (10k min) | GH equivalent | GH price | Savings vs GH† |
|---|---|---|---|---|---|
| `lite` | 1/16 / 0.25 GiB | $0.46 – $1.21 | 1-core slim | $20 | **94% – 98%** |
| `basic` | 1/4 / 1 GiB | $1.67 – $4.67 | 1-core slim | $20 | **77% – 92%** |
| `standard-1` | 1/2 / 4 GiB | $6.34 – $12.34 | 1-core slim | $20 | **38% – 68%** |
| `standard-2` | 1 / 6 GiB | $9.50 – $21.50 | 1-core slim | $20 | **−8% – 53%** |
| `standard-3` | 2 / 8 GiB | $12.67 – $36.67 | 2-core | $60 | **39% – 79%** |
| `standard-4` | 4 / 12 GiB | $18.84 – $66.84 | 4-core | $120 | **44% – 84%** |

† Range is `(GH − CF) / GH`. **Low end** of CF cost = 0% CPU utilization
(only memory + disk billed while awake). **High end** = 100% CPU
utilization (memory + disk + full vCPU-seconds). The single negative
figure (`standard-2 @ 100% CPU = −8%`) is an artifact: at saturation,
CF's `standard-2` (6 GiB RAM) is over-provisioned vs GitHub's slim
1-core (~4 GiB) — not the same hardware. Anything below ~85% CPU on
`standard-2` is still cheaper. Prices verified **2026-05-28**; see the
[Cloudflare Containers pricing page](https://developers.cloudflare.com/containers/pricing/)
for current rates.

## Architecture

GitHub Actions sends a `workflow_job/queued` webhook to a Cloudflare
Worker → the Worker mints a one-shot JIT runner config → starts a
container with the GitHub Actions runner binary → the container picks up
the job, runs it, exits. Container is destroyed; you only paid for the
seconds it ran.

Full diagram + per-component description in
[docs/architecture.md](docs/architecture.md).

## Quick setup

Two sides to configure: **Cloudflare** (deploy the Worker) and **GitHub**
(create the App + install it on your org).

### Cloudflare side

1. Clone this repo.
2. Install deps: `cd runner && pnpm install`.
3. Deploy the Worker: `pnpm exec wrangler deploy`. (First deploy
   uploads the container image; takes a few minutes.)
4. Set 3 secrets after creating the GitHub App in the next section:
   `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`.

### GitHub side

1. Create a new GitHub App at
   `https://github.com/organizations/<your-org>/settings/apps/new`.
   Permissions: `Actions: read`, `Administration: read+write`,
   `Metadata: read`. Subscribe to `Workflow job` events.
2. Webhook URL = `https://neuralyn-github-container-runner.<your-subdomain>.workers.dev/webhook`.
3. Generate a private key. Convert PKCS#1 → PKCS#8 (GitHub gives PKCS#1
   by default; the Worker needs PKCS#8 — see
   [runner/README.md](runner/README.md) for the one-liner).
4. Install the App on your org.

Full step-by-step in [**runner/README.md**](runner/README.md).

## Customization

- **Change the runner image** (add Python, Postgres, browsers, etc.):
  see [docs/customization.md](docs/customization.md).
- **Switch instance type** (RAM / vCPU / disk):
  see [docs/instance-types.md](docs/instance-types.md).
- **Use an alternative Dockerfile** (Laravel, WordPress, Phoenix, etc.):
  see [examples/dockerfiles/](examples/dockerfiles/).

## Examples

Standalone, copy-paste-ready workflows in
[examples/workflows/](examples/workflows/):

- PR check for Node, Laravel.
- Deploy a Worker (simple, with bindings validation, in matrix waves).
- Auto-fix failed PRs with Claude Code.
- Open a tracking issue on CI failure.
- Notify a webhook or Pushover on success/failure.

See the [workflows README](examples/workflows/README.md) for a one-line
description of each.

## Caveats

- **Cloudflare Containers is still in beta.** Pricing and features may
  change. This README's cost figures are dated 2026-05-28 — verify
  current pricing at the link above.
- **Cold start latency.** A container that's been asleep takes ~5-10
  seconds to start. For latency-sensitive workflows you can set
  `sleep_after` higher to keep containers warm at the cost of a slightly
  larger memory bill.
- **`workflow_job` webhook can occasionally drop.** GitHub doesn't retry
  failed deliveries. The included `auto-recovery.yml` pattern (separate
  file, watch this space) covers the most common case.

## Contributing

PRs welcome. The structure is intentionally small to keep maintenance
manageable:

- `runner/` — the deployable Worker. Tests run via `pnpm test`.
- `examples/` — copy-paste recipes. Keep additions standalone (no
  internal-only dependencies).
- `docs/` — three focused docs; resist the urge to add a docs site.

## License

MIT — see [LICENSE](LICENSE).
