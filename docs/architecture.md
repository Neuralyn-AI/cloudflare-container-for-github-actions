# Architecture

```
                       ┌─────────────────────┐
                       │  GitHub Actions     │
                       │  workflow_job event │
                       └──────────┬──────────┘
                                  │ webhook (HMAC-signed)
                                  v
                       ┌─────────────────────┐
                       │  Cloudflare Worker  │
                       │  /webhook handler   │
                       │  - verify HMAC      │
                       │  - filter to queued │
                       │  - mint JIT config  │
                       └──────────┬──────────┘
                                  │ Durable Object → start container
                                  v
                  ┌───────────────────────────────┐
                  │  Container (per job)          │
                  │  - bash entrypoint            │
                  │  - actions-runner --jitconfig │
                  │  - registers with GitHub      │
                  │  - runs the job              │
                  │  - exits (container destroyed)│
                  └───────────────────────────────┘
                                  │ job results sent back
                                  v
                       ┌─────────────────────┐
                       │  GitHub Actions UI  │
                       └─────────────────────┘
```

## Components

### Worker (`runner/src/`)

5 small TypeScript files (~273 LOC):

- **`index.ts`** — the fetch handler. POST `/webhook` only. Verifies the
  signature, decodes the payload, decides whether to act, hands off to
  the Durable Object.
- **`hmac.ts`** — HMAC-SHA256 verification of the `X-Hub-Signature-256`
  header against `GITHUB_WEBHOOK_SECRET`. Constant-time comparison.
- **`webhook-filter.ts`** — filters incoming events: act only on
  `workflow_job` events with `action == "queued"` AND a label set that
  includes our `cf-container` label.
- **`github-app.ts`** — turns the GH App private key into a short-lived
  JWT, exchanges it for an installation token, and uses that to request
  a JIT runner config via the GitHub REST API.
- **`container.ts`** — the Durable Object that owns the container
  binding. It receives `(runner_label, jit_config_url)` and starts a
  container with `RUNNER_JITCONFIG` env var set.

### Container (`runner/Dockerfile` + `runner/entrypoint.sh`)

The container image bundles:

- Ubuntu 24.04 base (amd64-forced).
- The `actions/runner` binary downloaded at build time.
- Any toolchain you want (default: Node + pnpm + wrangler).
- The entrypoint script that `exec`s `./run.sh --jitconfig "$RUNNER_JITCONFIG"`.

The Worker passes `RUNNER_JITCONFIG` as a container env var when
starting it. The runner registers with GitHub using that config, picks
up the queued job, runs it, and the container exits — Cloudflare
destroys the container.

### Why "JIT" and not long-lived runners

JIT (just-in-time) runners are GitHub's mechanism for one-shot runners
that auto-deregister after a single job. Two advantages:

1. **No persistent runner pool to maintain.** Every job gets a clean
   container — no cross-job contamination, no orphaned processes.
2. **Self-cleaning.** The runner registration is bound to one job ID;
   GitHub deletes the registration after the job ends. No stale runners
   piling up in the org's runner list.

The Worker mints a fresh JIT config for every queued job, so each
container is independent.

## Data flow per job

1. User pushes commit / opens PR / etc.
2. GitHub Actions schedules a workflow run; one of the jobs has
   `runs-on: [self-hosted, cf-container]`.
3. GitHub sends a `workflow_job/queued` webhook to the Worker's
   `/webhook` endpoint.
4. Worker verifies HMAC, confirms labels include `cf-container`.
5. Worker uses the GH App credentials to request a JIT config from
   `POST /repos/.../actions/runners/generate-jitconfig`.
6. Worker hands the JIT config to a Durable Object, which starts a
   container with `RUNNER_JITCONFIG=<config>`.
7. Container boots, the `actions-runner` agent registers with GitHub
   using the JIT config, picks up the queued job, runs it.
8. Container exits when the runner exits. Cloudflare destroys the
   container. The runner registration is deleted automatically by
   GitHub (JIT semantics).

## Why this is cheaper than GitHub-hosted runners

- **GitHub Actions doesn't bill `self-hosted` runs.** You only pay for
  the underlying compute (the Cloudflare Container).
- **Cloudflare bills per second of actual usage:** memory + disk while
  the container is awake (provisioned size), and CPU only while it's
  actively burning vCPU-seconds.
- **Scale to zero:** sleeping containers cost nothing.

See the cost comparison table in the [main README](../README.md).
