# Instance types

Cloudflare Containers ships 6 instance types. The right choice depends
on your workload (memory headroom, vCPU for compute, disk for
caches/images).

## Sizes

| Type | vCPU | Memory | Disk | Best for |
|---|---|---|---|---|
| `lite` | 1/16 | 256 MiB | 2 GB | Tiny jobs: lint, syntax check, doc builds |
| `basic` | 1/4 | 1 GiB | 4 GB | Single-file Node tests, small Python scripts |
| `standard-1` | 1/2 | 4 GiB | 8 GB | Typical Node/Python/Go test suites |
| `standard-2` | 1 | 6 GiB | 12 GB | **DEFAULT** — Laravel, monorepos with one stack |
| `standard-3` | 2 | 8 GiB | 16 GB | Heavy test suites, parallel matrix runners |
| `standard-4` | 4 | 12 GiB | 20 GB | Large compile jobs (Rust release builds, etc.) |

> **Authoritative reference:** Cloudflare's Containers types page — <https://developers.cloudflare.com/containers/platform-details/instance-types/>.
> Verify before changing your deployment; these specs can drift.

## How to change it

Edit `runner/wrangler.jsonc`:

```jsonc
"containers": [
  {
    "class_name": "RunnerContainer",
    "image": "./Dockerfile",
    "instance_type": "standard-3",     // ← change this
    "max_instances": 10,
    "rollout_step_percentage": [100]
  }
]
```

Re-deploy:

```bash
cd runner && pnpm exec wrangler deploy
```

The change takes effect immediately — the next JIT runner starts on the
new type. Containers already running finish their current job on the old
type.

## When to upgrade

**Symptoms that say "go bigger":**
- Jobs OOM (look for `Killed` or exit code 137 in the runner logs).
- `pnpm install` is the slowest step (RAM-bound on small instances).
- Postgres / MySQL startup is flaky (needs RAM headroom + disk).

**Symptoms that say "go smaller":**
- Jobs idle most of their wallclock time waiting on I/O (you're paying
  for provisioned RAM that's mostly unused).
- Single-process jobs that don't need multiple cores.

## Billing recap

Memory and disk are billed **per second the container is awake**, based
on the **provisioned** size of the instance type — even if your job uses
less. CPU is billed only for **actual** vCPU-seconds consumed (since
2025-11). Sleeping containers cost nothing.

So picking too big a type wastes the memory/disk delta. Picking too
small a type means failed jobs (which are also wasted minutes).

See the cost comparison in the [main README](../README.md) for the full
breakdown across types.

## `max_instances`

This is the cap on concurrent containers your Worker can spin up. The
default is `10` in this repo — conservative for new accounts to avoid
hitting Cloudflare's free-tier ceilings. For a busy CI pipeline with a
big matrix, you'll want to raise this. Cloudflare's current cap is
documented at the link above.
