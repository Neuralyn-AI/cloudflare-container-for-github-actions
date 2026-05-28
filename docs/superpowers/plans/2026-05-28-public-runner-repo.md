# Public OSS Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `Neuralyn-AI/cloudflare-container-for-github-actions` — a sanitized, fully-documented open-source version of the `neuralyn-ci-runner` Worker + Container, including 6 alternate Dockerfiles, 9 standalone workflow examples, and a cost-comparison-driven README.

**Architecture:** Single repo, MIT licensed. Three top-level dirs: `runner/` (deployable Worker, copied + sanitized from internal source), `examples/` (alternate Dockerfiles + standalone workflow YAMLs), `docs/` (customization cookbook, instance-types guide, architecture). Root README explains why the project exists, how the savings vs. GitHub-hosted runners work, and contains the cost comparison table.

**Tech Stack:**
- Cloudflare Workers + Containers (beta) — runtime for the runner
- TypeScript (existing Worker code, copied verbatim)
- Vitest 4 + `@cloudflare/workers-types` — Worker tests
- Bash — entrypoint, plus shell snippets in docs/examples
- GitHub Actions YAML — workflow examples
- Dockerfile (multi-arch via `--platform=linux/amd64`)

**Source for copying:** `/Volumes/Data/Projects/Neuralyn/cloudflare-deploy-github-actions/` (the internal repo). The new repo is at `/Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions/`, already initialized with `git init` and the spec already committed at `1ef00a4`.

---

### Task 1: Repo scaffolding — LICENSE, .gitignore, placeholder README

**Files:**
- Create: `LICENSE`
- Create: `.gitignore`
- Create: `README.md` (placeholder; replaced in Task 8)

- [ ] **Step 1: Write `LICENSE` (MIT)**

Create `LICENSE` with the standard MIT text:

```
MIT License

Copyright (c) 2026 Neuralyn-AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Write `.gitignore`**

Create `.gitignore`:

```
# Dependencies
node_modules/

# Wrangler / Cloudflare
.wrangler/
.dev.vars
.dev.vars.*

# Build artifacts
dist/
*.tsbuildinfo

# Editor + OS
.DS_Store
.vscode/
.idea/
*.swp

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
```

- [ ] **Step 3: Write placeholder `README.md`**

Create `README.md` (will be replaced in Task 8):

```markdown
# cloudflare-container-for-github-actions

Self-hosted GitHub Actions runners on Cloudflare Containers. Full README under construction — see [spec](docs/superpowers/specs/2026-05-28-public-runner-repo-design.md) for what's coming.
```

- [ ] **Step 4: Commit**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
git add LICENSE .gitignore README.md
git commit -m "chore: scaffold repo (LICENSE, .gitignore, placeholder README)"
```

---

### Task 2: Copy + sanitize `runner/` from internal source

**Files:**
- Create: `runner/src/index.ts` (copy from source)
- Create: `runner/src/container.ts` (copy)
- Create: `runner/src/github-app.ts` (copy)
- Create: `runner/src/hmac.ts` (copy)
- Create: `runner/src/types.ts` (copy)
- Create: `runner/src/webhook-filter.ts` (copy)
- Create: `runner/test/github-app.test.ts` (copy)
- Create: `runner/test/hmac.test.ts` (copy)
- Create: `runner/test/webhook-filter.test.ts` (copy)
- Create: `runner/test/fixtures/workflow_job_queued.json` (copy)
- Create: `runner/package.json` (copy + edit `name`)
- Create: `runner/tsconfig.json` (copy verbatim)
- Create: `runner/vitest.config.ts` (copy verbatim)
- Create: `runner/wrangler.jsonc` (edit `name`, `instance_type`)
- Create: `runner/entrypoint.sh` (copy verbatim)
- Create: `runner/Dockerfile` (trimmed version — separate task to fully rewrite)
- Create: `runner/README.md` (copy + sanitize org refs)

Copies of TypeScript and test code are verbatim — they contain no Neuralyn-specific logic. Sanitization only touches `package.json` `name`, `wrangler.jsonc` `name`/`instance_type`, and `runner/README.md` org references. The full Dockerfile rewrite happens in Task 3.

- [ ] **Step 1: Copy the source code and tests verbatim**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
SRC=/Volumes/Data/Projects/Neuralyn/cloudflare-deploy-github-actions/runner

mkdir -p runner/src runner/test/fixtures
cp "$SRC"/src/*.ts runner/src/
cp "$SRC"/test/*.test.ts runner/test/
cp "$SRC"/test/fixtures/*.json runner/test/fixtures/
cp "$SRC"/tsconfig.json runner/tsconfig.json
cp "$SRC"/vitest.config.ts runner/vitest.config.ts
cp "$SRC"/entrypoint.sh runner/entrypoint.sh
chmod +x runner/entrypoint.sh
```

Verify file count:

```bash
ls runner/src/ runner/test/ runner/test/fixtures/
```

Expected: 6 files in `runner/src/`, 3 `.test.ts` files in `runner/test/`, 1 `workflow_job_queued.json` in `runner/test/fixtures/`.

- [ ] **Step 2: Create sanitized `runner/package.json`**

Write `runner/package.json`:

```json
{
  "name": "@neuralyn/github-container-runner",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "deploy": "wrangler deploy",
    "dev": "wrangler dev"
  },
  "dependencies": {
    "@cloudflare/containers": "^0.0.30"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260101.0",
    "typescript": "~5.6.2",
    "vitest": "^4.1.5",
    "wrangler": "^4.86.0"
  }
}
```

Only the `name` differs from the source.

- [ ] **Step 3: Create sanitized `runner/wrangler.jsonc`**

Write `runner/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "neuralyn-github-container-runner",
  "main": "src/index.ts",
  "compatibility_date": "2026-05-01",
  "observability": {
    "logs": { "enabled": true }
  },
  "containers": [
    {
      "class_name": "RunnerContainer",
      "image": "./Dockerfile",
      "instance_type": "standard-2",
      "max_instances": 10,
      "rollout_step_percentage": [100]
    }
  ],
  "durable_objects": {
    "bindings": [
      { "class_name": "RunnerContainer", "name": "RUNNER" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["RunnerContainer"] }
  ]
}
```

Changes vs source: `name` is `neuralyn-github-container-runner` (was `neuralyn-ci-runner`), `instance_type` is `standard-2` (was `standard-3`, smaller default for new adopters), `max_instances` is `10` (was `50`, conservative default).

- [ ] **Step 4: Install dependencies and verify Worker tests still pass**

```bash
cd runner
pnpm install
pnpm test
```

Expected: All vitest tests pass (3 test files, total ~30 tests). If anything fails, the copy was incomplete — re-check `src/` and `test/` contents.

- [ ] **Step 5: Sanitize `runner/README.md`**

The source `runner/README.md` from `/Volumes/Data/Projects/Neuralyn/cloudflare-deploy-github-actions/runner/README.md` is already in English. Copy it and make these substitutions:

```bash
cp /Volumes/Data/Projects/Neuralyn/cloudflare-deploy-github-actions/runner/README.md runner/README.md
```

Then open `runner/README.md` and apply the following exact text replacements (use the Edit tool, one per occurrence — `replace_all: true` is fine since the strings are unique):

| Find | Replace |
|---|---|
| `Neuralyn CI Runner` | `GitHub Container Runner` |
| `neuralyn-ci-runner` | `neuralyn-github-container-runner` |
| `Neuralyn-AI` (in URLs and prose) | `<your-org>` |
| `Neuralyn CI Dispatcher` (the GitHub App name suggestion) | `GitHub Container Runner Dispatcher` |
| `https://neuralyn.com` (the App Homepage URL) | `https://github.com/<your-org>/cloudflare-container-for-github-actions` |
| Any leading reference to the internal design doc path (`../docs/superpowers/specs/2026-05-24-cloudflare-container-ci-runner-design.md`) | `../docs/architecture.md` |

After all substitutions, manually scan the file for any remaining `Neuralyn-AI` or `neuralyn-ci-runner` mentions and replace.

- [ ] **Step 6: Commit (Dockerfile still missing — covered in Task 3)**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
git add runner/src runner/test runner/package.json runner/tsconfig.json \
        runner/vitest.config.ts runner/wrangler.jsonc runner/entrypoint.sh \
        runner/README.md
git commit -m "feat(runner): copy + sanitize Worker source from internal repo

Worker name: neuralyn-github-container-runner. Default instance_type:
standard-2 (smaller than source repo to stay longer in CF free tier).
Tests pass: pnpm test green from runner/ dir."
```

---

### Task 3: Trimmed default Dockerfile (Node + pnpm + wrangler only)

**Files:**
- Create: `runner/Dockerfile`

The source `runner/Dockerfile` bundles PHP, Postgres, Composer, hadolint, etc. — useful for a monorepo with multiple stacks, overkill as a default for OSS users. This task writes a minimal Dockerfile with only Node + pnpm + wrangler + actions-runner (the absolute baseline for any CI/deploy use case). Specialty stacks move to `examples/dockerfiles/` (Task 4).

- [ ] **Step 1: Write `runner/Dockerfile`**

Create `runner/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7
# Cloudflare Containers runs only on linux/amd64. Pinning here forces amd64
# even when building on Apple Silicon (uses QEMU emulation locally — slower
# but produces a runnable image). Without this, ARM-host docker would build
# linux/arm64 and the pushed image would fail with "exec format error" on
# Cloudflare's infra, with no application logs.
FROM --platform=linux/amd64 ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_VERSION=2.334.0
ENV NODE_VERSION=24.15.0
ENV PNPM_VERSION=9.15.4
ENV WRANGLER_VERSION=4.86.0

# Base tooling required by actions/checkout, setup-node, and most CI scripts.
# libicu74: required by the GitHub Actions runner (.NET Runner.Listener uses
# System.Globalization). The runner v2.334.x installdependencies.sh doesn't
# always pick the right ICU on Ubuntu 24.04 (noble) — install it explicitly.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip xz-utils sudo gnupg \
      libicu74 \
 && rm -rf /var/lib/apt/lists/*

# Non-root runner user (created early so we can chown the tool cache).
RUN useradd -m -s /bin/bash runner \
 && echo "runner ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/runner

# Node pre-installed into the GitHub-hosted-style tool cache so that
# `actions/setup-node@v4` finds it locally and skips its download step.
# setup-node looks for ${RUNNER_TOOL_CACHE}/node/${version}/${arch}/ and
# a sibling marker file `${arch}.complete`.
#
# IMPORTANT: we deliberately put this at /opt/hostedtoolcache, NOT under
# /home/runner/_work/_tool (the default). The runner agent recreates _work
# fresh on startup for ephemeral/JIT runners, wiping any pre-population.
# /opt/hostedtoolcache is the same path GitHub-hosted runners use and is
# left alone by the agent. We set RUNNER_TOOL_CACHE explicitly so setup-node
# looks here.
ENV RUNNER_TOOL_CACHE=/opt/hostedtoolcache
ENV NODE_ARCH=x64
RUN mkdir -p "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar -xJ -C "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" --strip-components=1 \
 && touch "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}.complete" \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}"

# Put the tool-cache Node on PATH so subsequent RUNs (and the runner itself)
# can use node/npm; also symlink for any code that hardcodes /usr/local/bin.
ENV PATH="${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin:${PATH}"
RUN ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/node"  /usr/local/bin/node  \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npm"   /usr/local/bin/npm   \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npx"   /usr/local/bin/npx

# pnpm + wrangler (CLIs commonly invoked from CI workflows for Cloudflare
# deploys). Drop wrangler if you don't deploy to Cloudflare from CI —
# see examples/dockerfiles/node-only.dockerfile.
RUN npm install -g "pnpm@${PNPM_VERSION}" "wrangler@${WRANGLER_VERSION}" \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/pnpm"    /usr/local/bin/pnpm \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/wrangler" /usr/local/bin/wrangler \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}"

USER runner
WORKDIR /home/runner

# GitHub Actions runner binary. The binary itself is downloaded from
# actions/runner releases; GitHub's EULA governs use of that binary,
# we do not redistribute it.
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then RUNNER_ARCH="arm64"; else RUNNER_ARCH="x64"; fi && \
    curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" \
  | tar -xz

# Native deps required by the runner (libicu74 already installed above).
USER root
RUN /home/runner/bin/installdependencies.sh \
 && rm -rf /var/lib/apt/lists/*
USER runner

COPY --chown=runner:runner --chmod=0755 entrypoint.sh /home/runner/entrypoint.sh

ENTRYPOINT ["/home/runner/entrypoint.sh"]
```

- [ ] **Step 2: Build verify (optional but recommended)**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions/runner
docker build --platform=linux/amd64 -t cf-runner-default-test . 2>&1 | tail -20
docker image inspect cf-runner-default-test --format='{{.Size}}' | awk '{ printf "%.1f MB\n", $1/1024/1024 }'
```

Expected: build completes; image size ≈ 800-1000 MB. If `docker` isn't available locally (or builds slowly on Apple Silicon under emulation), skip this step — the GitHub Actions runner in the public repo's own CI will catch any Dockerfile bugs.

- [ ] **Step 3: Commit**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
git add runner/Dockerfile
git commit -m "feat(runner): trimmed default Dockerfile (Node + pnpm + wrangler)

Removed PHP / Postgres / Composer / hadolint / Vite-specific bits that
were in the internal source image — those move to examples/dockerfiles.
Default image targets the most common case: a CI worker that runs Node
tests and optionally deploys via wrangler."
```

---

### Task 4: `examples/dockerfiles/` — 6 variants + README

**Files:**
- Create: `examples/dockerfiles/node-pnpm-wrangler.dockerfile`
- Create: `examples/dockerfiles/node-only.dockerfile`
- Create: `examples/dockerfiles/php-postgresql.dockerfile`
- Create: `examples/dockerfiles/php-mysql.dockerfile`
- Create: `examples/dockerfiles/elixir-phoenix-postgres.dockerfile`
- Create: `examples/dockerfiles/playwright.dockerfile`
- Create: `examples/dockerfiles/README.md`

- [ ] **Step 1: Create `examples/dockerfiles/node-pnpm-wrangler.dockerfile`**

This variant is **byte-identical** to `runner/Dockerfile` (kept here so the side-by-side listing of all options is complete):

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
mkdir -p examples/dockerfiles
cp runner/Dockerfile examples/dockerfiles/node-pnpm-wrangler.dockerfile
```

Then prepend an explanatory header. Use the Edit tool to insert this at the very top, before the existing `# syntax=` line:

```
# Variant: Node + pnpm + wrangler (DEFAULT)
# Approx image size: 800-1000 MB
# Best for: Cloudflare Workers deploys, Node test suites, monorepos using pnpm
# Pair with: standard-1 (4 GiB) or standard-2 (6 GiB) instance type
# Swap in: cp examples/dockerfiles/node-pnpm-wrangler.dockerfile runner/Dockerfile
#
```

- [ ] **Step 2: Create `examples/dockerfiles/node-only.dockerfile`**

Write `examples/dockerfiles/node-only.dockerfile`:

```dockerfile
# Variant: Node-only (no pnpm, no wrangler)
# Approx image size: 550-700 MB
# Best for: Lean test pipelines for Node projects that don't deploy from CI
# Pair with: lite or basic instance type
# Swap in: cp examples/dockerfiles/node-only.dockerfile runner/Dockerfile
#
# syntax=docker/dockerfile:1.7
FROM --platform=linux/amd64 ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_VERSION=2.334.0
ENV NODE_VERSION=24.15.0

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip xz-utils sudo gnupg libicu74 \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash runner \
 && echo "runner ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/runner

ENV RUNNER_TOOL_CACHE=/opt/hostedtoolcache
ENV NODE_ARCH=x64
RUN mkdir -p "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar -xJ -C "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" --strip-components=1 \
 && touch "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}.complete" \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}"

ENV PATH="${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin:${PATH}"
RUN ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/node" /usr/local/bin/node  \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npm"  /usr/local/bin/npm   \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npx"  /usr/local/bin/npx

USER runner
WORKDIR /home/runner

RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then RUNNER_ARCH="arm64"; else RUNNER_ARCH="x64"; fi && \
    curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" \
  | tar -xz

USER root
RUN /home/runner/bin/installdependencies.sh && rm -rf /var/lib/apt/lists/*
USER runner

COPY --chown=runner:runner --chmod=0755 entrypoint.sh /home/runner/entrypoint.sh
ENTRYPOINT ["/home/runner/entrypoint.sh"]
```

- [ ] **Step 3: Create `examples/dockerfiles/php-postgresql.dockerfile`**

Write `examples/dockerfiles/php-postgresql.dockerfile`:

```dockerfile
# Variant: PHP 8.2 + PostgreSQL 16 (Laravel-style)
# Approx image size: 1.4-1.6 GB
# Best for: Laravel, Symfony, any PHP project that needs Postgres in-container
# Pair with: standard-2 (6 GiB) or standard-3 (8 GiB) instance type
# Swap in: cp examples/dockerfiles/php-postgresql.dockerfile runner/Dockerfile
#
# Workflow steps must start Postgres at job time (Cloudflare Containers
# doesn't expose Docker socket so GH Actions `services:` won't work).
# See examples/workflows/pr-check-laravel.yml for the start sequence.
#
# syntax=docker/dockerfile:1.7
FROM --platform=linux/amd64 ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_VERSION=2.334.0
ENV NODE_VERSION=24.15.0
ENV PHP_VERSION=8.2

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip xz-utils sudo gnupg \
      software-properties-common libicu74 \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash runner \
 && echo "runner ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/runner

# PHP 8.2 from the ondrej/php PPA (Ubuntu 24.04 ships 8.3 by default).
RUN add-apt-repository -y ppa:ondrej/php \
 && apt-get update && apt-get install -y --no-install-recommends \
      php${PHP_VERSION} \
      php${PHP_VERSION}-cli \
      php${PHP_VERSION}-pdo \
      php${PHP_VERSION}-pgsql \
      php${PHP_VERSION}-sqlite3 \
      php${PHP_VERSION}-zip \
      php${PHP_VERSION}-mbstring \
      php${PHP_VERSION}-xml \
      php${PHP_VERSION}-intl \
      php${PHP_VERSION}-curl \
      php${PHP_VERSION}-bcmath \
      php${PHP_VERSION}-gd \
 && rm -rf /var/lib/apt/lists/* \
 && update-alternatives --install /usr/bin/php php /usr/bin/php${PHP_VERSION} 100

# Composer 2
RUN curl -fsSL https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# PostgreSQL 16. Cloudflare Containers doesn't mount /dev/shm, so the
# default `posix` dynamic_shared_memory_type fails. Append `mmap` to
# postgresql.conf — slower but works in any container.
RUN apt-get update && apt-get install -y --no-install-recommends \
      postgresql postgresql-contrib \
 && rm -rf /var/lib/apt/lists/* \
 && echo "dynamic_shared_memory_type = mmap" >> /etc/postgresql/16/main/postgresql.conf

# Node (for setup-node) + actions-runner
ENV RUNNER_TOOL_CACHE=/opt/hostedtoolcache
ENV NODE_ARCH=x64
RUN mkdir -p "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar -xJ -C "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" --strip-components=1 \
 && touch "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}.complete" \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}"

ENV PATH="${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin:${PATH}"
RUN ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/node" /usr/local/bin/node \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npm"  /usr/local/bin/npm

USER runner
WORKDIR /home/runner
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then RUNNER_ARCH="arm64"; else RUNNER_ARCH="x64"; fi && \
    curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" \
  | tar -xz

USER root
RUN /home/runner/bin/installdependencies.sh && rm -rf /var/lib/apt/lists/*
USER runner

COPY --chown=runner:runner --chmod=0755 entrypoint.sh /home/runner/entrypoint.sh
ENTRYPOINT ["/home/runner/entrypoint.sh"]
```

- [ ] **Step 4: Create `examples/dockerfiles/php-mysql.dockerfile`**

Write `examples/dockerfiles/php-mysql.dockerfile`:

```dockerfile
# Variant: PHP 8.2 + MySQL 8 (WordPress-style)
# Approx image size: 1.5-1.7 GB
# Best for: WordPress, legacy PHP apps that depend on MySQL
# Pair with: standard-2 (6 GiB) or standard-3 (8 GiB) instance type
# Swap in: cp examples/dockerfiles/php-mysql.dockerfile runner/Dockerfile
#
# Same caveats as php-postgresql.dockerfile: workflows must start MySQL at
# job time. See examples/workflows/pr-check-laravel.yml for the pattern;
# substitute mysql for postgres.
#
# syntax=docker/dockerfile:1.7
FROM --platform=linux/amd64 ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_VERSION=2.334.0
ENV NODE_VERSION=24.15.0
ENV PHP_VERSION=8.2

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip xz-utils sudo gnupg \
      software-properties-common libicu74 \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash runner \
 && echo "runner ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/runner

# PHP 8.2 from ondrej/php
RUN add-apt-repository -y ppa:ondrej/php \
 && apt-get update && apt-get install -y --no-install-recommends \
      php${PHP_VERSION} \
      php${PHP_VERSION}-cli \
      php${PHP_VERSION}-pdo \
      php${PHP_VERSION}-mysql \
      php${PHP_VERSION}-mysqli \
      php${PHP_VERSION}-zip \
      php${PHP_VERSION}-mbstring \
      php${PHP_VERSION}-xml \
      php${PHP_VERSION}-intl \
      php${PHP_VERSION}-curl \
      php${PHP_VERSION}-bcmath \
      php${PHP_VERSION}-gd \
 && rm -rf /var/lib/apt/lists/* \
 && update-alternatives --install /usr/bin/php php /usr/bin/php${PHP_VERSION} 100

# Composer 2
RUN curl -fsSL https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# MySQL 8 server. Ubuntu 24.04 packages mysql-server-8.
RUN apt-get update && apt-get install -y --no-install-recommends \
      mysql-server mysql-client \
 && rm -rf /var/lib/apt/lists/*

# Node + actions-runner
ENV RUNNER_TOOL_CACHE=/opt/hostedtoolcache
ENV NODE_ARCH=x64
RUN mkdir -p "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar -xJ -C "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" --strip-components=1 \
 && touch "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}.complete" \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}"

ENV PATH="${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin:${PATH}"
RUN ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/node" /usr/local/bin/node \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npm"  /usr/local/bin/npm

USER runner
WORKDIR /home/runner
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then RUNNER_ARCH="arm64"; else RUNNER_ARCH="x64"; fi && \
    curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" \
  | tar -xz

USER root
RUN /home/runner/bin/installdependencies.sh && rm -rf /var/lib/apt/lists/*
USER runner

COPY --chown=runner:runner --chmod=0755 entrypoint.sh /home/runner/entrypoint.sh
ENTRYPOINT ["/home/runner/entrypoint.sh"]
```

- [ ] **Step 5: Create `examples/dockerfiles/elixir-phoenix-postgres.dockerfile`**

Write `examples/dockerfiles/elixir-phoenix-postgres.dockerfile`:

```dockerfile
# Variant: Elixir 1.17 + Erlang/OTP 27 + PostgreSQL 16 (Phoenix-style)
# Approx image size: 1.3-1.5 GB
# Best for: Phoenix apps, mix test, ecto migrations
# Pair with: standard-2 (6 GiB) or standard-3 (8 GiB) instance type
# Swap in: cp examples/dockerfiles/elixir-phoenix-postgres.dockerfile runner/Dockerfile
#
# Workflow must start Postgres at job time, same pattern as the
# Laravel example. Run `mix deps.get && mix ecto.migrate && mix test`.
#
# syntax=docker/dockerfile:1.7
FROM --platform=linux/amd64 ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_VERSION=2.334.0
ENV NODE_VERSION=24.15.0

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip xz-utils sudo gnupg \
      build-essential libssl-dev libncurses5-dev libstdc++6 \
      libicu74 inotify-tools \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash runner \
 && echo "runner ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/runner

# Erlang/OTP + Elixir from the Erlang Solutions APT repo.
RUN curl -fsSL https://binaries2.erlang-solutions.com/GPG-KEY-pmanager.asc \
    | gpg --dearmor -o /usr/share/keyrings/erlang-solutions.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/erlang-solutions.gpg] https://binaries2.erlang-solutions.com/ubuntu noble contrib" \
    > /etc/apt/sources.list.d/erlang-solutions.list \
 && apt-get update && apt-get install -y --no-install-recommends \
      esl-erlang elixir \
 && rm -rf /var/lib/apt/lists/* \
 && mix local.hex --force \
 && mix local.rebar --force

# PostgreSQL 16 with mmap shm fallback
RUN apt-get update && apt-get install -y --no-install-recommends \
      postgresql postgresql-contrib \
 && rm -rf /var/lib/apt/lists/* \
 && echo "dynamic_shared_memory_type = mmap" >> /etc/postgresql/16/main/postgresql.conf

# Node (some Phoenix asset pipelines need it) + actions-runner
ENV RUNNER_TOOL_CACHE=/opt/hostedtoolcache
ENV NODE_ARCH=x64
RUN mkdir -p "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar -xJ -C "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" --strip-components=1 \
 && touch "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}.complete" \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}"

ENV PATH="${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin:${PATH}"
RUN ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/node" /usr/local/bin/node \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npm"  /usr/local/bin/npm

USER runner
WORKDIR /home/runner
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then RUNNER_ARCH="arm64"; else RUNNER_ARCH="x64"; fi && \
    curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" \
  | tar -xz

USER root
RUN /home/runner/bin/installdependencies.sh && rm -rf /var/lib/apt/lists/*
USER runner

COPY --chown=runner:runner --chmod=0755 entrypoint.sh /home/runner/entrypoint.sh
ENTRYPOINT ["/home/runner/entrypoint.sh"]
```

- [ ] **Step 6: Create `examples/dockerfiles/playwright.dockerfile`**

Write `examples/dockerfiles/playwright.dockerfile`:

```dockerfile
# Variant: Node + Playwright (Chromium pre-installed)
# Approx image size: 1.1-1.3 GB
# Best for: end-to-end browser tests (Playwright, Puppeteer)
# Pair with: standard-2 (6 GiB) or standard-3 (8 GiB) instance type
# Swap in: cp examples/dockerfiles/playwright.dockerfile runner/Dockerfile
#
# Tied to a specific Playwright version (matches the @playwright/test version
# your project uses — keep them in sync). Override PLAYWRIGHT_VERSION as needed.
#
# syntax=docker/dockerfile:1.7
FROM --platform=linux/amd64 ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_VERSION=2.334.0
ENV NODE_VERSION=24.15.0
ENV PNPM_VERSION=9.15.4
ENV PLAYWRIGHT_VERSION=1.50.0

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip xz-utils sudo gnupg libicu74 \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash runner \
 && echo "runner ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/runner

ENV RUNNER_TOOL_CACHE=/opt/hostedtoolcache
ENV NODE_ARCH=x64
RUN mkdir -p "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" \
    | tar -xJ -C "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}" --strip-components=1 \
 && touch "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}.complete" \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}"

ENV PATH="${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin:${PATH}"
RUN ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/node" /usr/local/bin/node \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/npm"  /usr/local/bin/npm

RUN npm install -g "pnpm@${PNPM_VERSION}" \
 && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/pnpm" /usr/local/bin/pnpm

# Playwright Chromium + system deps. Uses Playwright's own installer to
# pull a tested-compatible Chromium build into ~/.cache/ms-playwright.
RUN npx -y "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chromium \
 && chown -R runner:runner /root/.cache 2>/dev/null || true

USER runner
WORKDIR /home/runner
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then RUNNER_ARCH="arm64"; else RUNNER_ARCH="x64"; fi && \
    curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz" \
  | tar -xz

USER root
RUN /home/runner/bin/installdependencies.sh && rm -rf /var/lib/apt/lists/*
USER runner

COPY --chown=runner:runner --chmod=0755 entrypoint.sh /home/runner/entrypoint.sh
ENTRYPOINT ["/home/runner/entrypoint.sh"]
```

- [ ] **Step 7: Create `examples/dockerfiles/README.md`**

Write `examples/dockerfiles/README.md`:

```markdown
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
```

- [ ] **Step 8: Commit**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
git add examples/dockerfiles/
git commit -m "feat(examples): 6 alternative Dockerfile variants + README

Variants: node-pnpm-wrangler (default copy), node-only, php-postgresql,
php-mysql, elixir-phoenix-postgres, playwright. Each has a header with
target use case, approx image size, and recommended instance type."
```

---

### Task 5: `examples/workflows/` — basic + deploy (5 files)

**Files:**
- Create: `examples/workflows/pr-check-node.yml`
- Create: `examples/workflows/pr-check-laravel.yml`
- Create: `examples/workflows/deploy-worker-simple.yml`
- Create: `examples/workflows/deploy-worker-with-validation.yml`
- Create: `examples/workflows/deploy-wave-matrix.yml`

Each workflow is **standalone** (no `uses:` of internal Neuralyn reusables). Top-of-file comment block explains what it does, secrets needed, prerequisites.

- [ ] **Step 1: Create `examples/workflows/pr-check-node.yml`**

```yaml
# Example: PR check for a Node project.
#
# What it does:
#   - Runs typecheck + tests + lint on every PR to main.
#   - Uses pnpm (swap for npm/yarn by editing the install + script names).
#
# Prerequisites:
#   - Worker deployed and labeling its runners with `cf-container`
#     (default — see runner/wrangler.jsonc).
#   - Repo has package.json scripts: `typecheck`, `test`, `lint`.
#
# Secrets required: none.

name: PR Check

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  check:
    name: Typecheck + Tests + Lint
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm lint
```

Create `examples/workflows/pr-check-node.yml` with the content above.

- [ ] **Step 2: Create `examples/workflows/pr-check-laravel.yml`**

```yaml
# Example: PR check for a Laravel (PHP + Postgres) project.
#
# What it does:
#   - Starts Postgres in-container (Cloudflare Containers has no Docker
#     socket so `services: postgres:` would fail with "docker not found").
#   - Runs Pint (style), PHPStan (static analysis), migrations, and PHPUnit.
#
# Prerequisites:
#   - Runner image has PHP + Postgres pre-installed.
#     Use examples/dockerfiles/php-postgresql.dockerfile.
#   - Repo has composer.json + vendor/bin/pint + vendor/bin/phpstan installed
#     via composer install.
#   - Repo has .env.example pre-configured for testing DB.
#
# Secrets required: none.

name: PR Check (Laravel)

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  laravel:
    name: Pint + PHPStan + Migrations + PHPUnit
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5

      - name: Verify PHP
        run: php --version

      - name: Start Postgres
        # Cloudflare Containers doesn't run systemd/dbus, so the usual
        # `service postgresql start` / `pg_ctlcluster` paths don't work.
        # Use pg_ctl directly. /var/run/postgresql is tmpfs and may need
        # re-creation on each boot.
        run: |
          PG_VERSION=16
          PG_HOME=/var/lib/postgresql/${PG_VERSION}/main
          PG_BIN=/usr/lib/postgresql/${PG_VERSION}/bin
          PG_CONF=/etc/postgresql/${PG_VERSION}/main/postgresql.conf
          sudo mkdir -p /var/run/postgresql
          sudo chown postgres:postgres /var/run/postgresql
          sudo -u postgres "$PG_BIN/pg_ctl" start \
              -D "$PG_HOME" -l /tmp/postgres-start.log \
              -o "-c config_file=$PG_CONF" -w -t 30
          sudo -u postgres psql -c "CREATE USER laravel WITH PASSWORD 'secret' SUPERUSER;"
          sudo -u postgres psql -c "CREATE DATABASE testing OWNER laravel;"
          pg_isready -h localhost -p 5432

      - name: Cache Composer dependencies
        uses: actions/cache@v5
        with:
          path: vendor
          key: composer-${{ hashFiles('composer.lock') }}

      - name: Install Composer dependencies
        run: composer install --prefer-dist --no-progress

      - name: Run Pint
        run: ./vendor/bin/pint --test

      - name: Run PHPStan
        run: ./vendor/bin/phpstan analyse --memory-limit=512M

      - name: Copy .env + generate key
        run: |
          cp .env.example .env
          php artisan key:generate

      - name: Run migrations
        run: php artisan migrate --force
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_PORT: 5432
          DB_DATABASE: testing
          DB_USERNAME: laravel
          DB_PASSWORD: secret

      - name: Run PHPUnit
        run: php artisan test
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_PORT: 5432
          DB_DATABASE: testing
          DB_USERNAME: laravel
          DB_PASSWORD: secret
```

- [ ] **Step 3: Create `examples/workflows/deploy-worker-simple.yml`**

```yaml
# Example: Deploy a single Cloudflare Worker on push to main.
#
# What it does:
#   - Runs `wrangler deploy` from the repo root on every push to main.
#
# Prerequisites:
#   - Repo has wrangler.jsonc at root.
#   - CLOUDFLARE_API_TOKEN secret with Workers Scripts: Edit permission.
#   - CLOUDFLARE_ACCOUNT_ID variable or secret.

name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy Worker
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Deploy
        run: pnpm exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN:  ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 4: Create `examples/workflows/deploy-worker-with-validation.yml`**

```yaml
# Example: Deploy a Worker with binding validation + dry-run before commit.
#
# What it does:
#   - Validates that every binding declared in wrangler.jsonc (KV, R2, D1,
#     Hyperdrive, Queues, etc.) exists in the Cloudflare account.
#   - Runs `wrangler deploy --dry-run` to catch build errors before the real
#     deploy.
#   - Only on success of the above two, runs the real `wrangler deploy`.
#
# Prerequisites:
#   - CLOUDFLARE_API_TOKEN secret with Workers Scripts: Edit AND read
#     permissions for whatever binding types the Worker uses (KV: Read,
#     R2: Read, etc.).
#   - CLOUDFLARE_ACCOUNT_ID secret.
#   - jq installed in the runner image (default Dockerfile has it).

name: Deploy with Validation

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  validate-bindings:
    name: Validate bindings exist
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - name: Strip JSONC comments + check bindings
        env:
          CLOUDFLARE_API_TOKEN:  ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          set -euo pipefail
          # Strip // and /* */ comments + trailing commas → valid JSON.
          config=$(node -e '
            const fs = require("fs");
            let s = fs.readFileSync("wrangler.jsonc", "utf8");
            s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
            s = s.replace(/,(\s*[\]}])/g, "$1");
            process.stdout.write(JSON.stringify(JSON.parse(s)));
          ')
          # Check each KV namespace exists.
          echo "$config" | jq -r '.kv_namespaces[]?.id' | while read -r id; do
            [ -z "$id" ] && continue
            curl -fsSL -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
              "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces/$id" \
              > /dev/null || { echo "::error::KV namespace $id not found"; exit 1; }
            echo "KV $id: OK"
          done
          # Check each R2 bucket exists.
          echo "$config" | jq -r '.r2_buckets[]?.bucket_name' | while read -r name; do
            [ -z "$name" ] && continue
            curl -fsSL -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
              "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$name" \
              > /dev/null || { echo "::error::R2 bucket $name not found"; exit 1; }
            echo "R2 $name: OK"
          done
          # Extend the pattern above for D1, Hyperdrive, Queues, etc.
          echo "All declared bindings exist."

  dry-run:
    name: Wrangler dry-run
    needs: validate-bindings
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Dry run
        run: pnpm exec wrangler deploy --dry-run --outdir=dist
        env:
          CLOUDFLARE_API_TOKEN:  ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy:
    name: Deploy
    needs: [validate-bindings, dry-run]
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Deploy
        run: pnpm exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN:  ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 5: Create `examples/workflows/deploy-wave-matrix.yml`**

```yaml
# Example: Deploy multiple Workers in waves (monorepo pattern).
#
# What it does:
#   - Splits affected workers into 3 sequential waves.
#   - Each wave runs a parallel matrix of `wrangler deploy` calls.
#   - Waves run serially: wave-2 waits for wave-1, wave-3 waits for wave-2.
#   - Caps simultaneous deploys to avoid hitting CF Container max_instances.
#
# Prerequisites:
#   - Monorepo with workers under packages/*/wrangler.jsonc.
#   - CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID secrets.
#   - The job that computes "affected" workers is left as an exercise (see
#     docs/architecture.md for the full pattern with turbo or custom resolver).
#     For simplicity, this example hardcodes the worker list per wave.

name: Deploy (waves)

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  wave-1:
    name: Deploy wave 1
    runs-on: [self-hosted, cf-container]
    strategy:
      fail-fast: false
      matrix:
        worker: [worker-a, worker-b, worker-c]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Deploy ${{ matrix.worker }}
        run: pnpm --filter "./packages/${{ matrix.worker }}" exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN:  ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  wave-2:
    name: Deploy wave 2
    needs: wave-1
    if: needs.wave-1.result == 'success' || needs.wave-1.result == 'skipped'
    runs-on: [self-hosted, cf-container]
    strategy:
      fail-fast: false
      matrix:
        worker: [worker-d, worker-e]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Deploy ${{ matrix.worker }}
        run: pnpm --filter "./packages/${{ matrix.worker }}" exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN:  ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  wave-3:
    name: Deploy wave 3
    needs: [wave-1, wave-2]
    if: |
      always() &&
      (needs.wave-1.result == 'success' || needs.wave-1.result == 'skipped') &&
      (needs.wave-2.result == 'success' || needs.wave-2.result == 'skipped')
    runs-on: [self-hosted, cf-container]
    strategy:
      fail-fast: false
      matrix:
        worker: [worker-f]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Deploy ${{ matrix.worker }}
        run: pnpm --filter "./packages/${{ matrix.worker }}" exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN:  ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 6: Lint all workflow YAMLs**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
for f in examples/workflows/*.yml; do
  python3 -c "import yaml; yaml.safe_load(open('$f')); print('$f: OK')"
done
```

Expected: 5 OK lines (one per file).

- [ ] **Step 7: Commit**

```bash
git add examples/workflows/pr-check-node.yml \
        examples/workflows/pr-check-laravel.yml \
        examples/workflows/deploy-worker-simple.yml \
        examples/workflows/deploy-worker-with-validation.yml \
        examples/workflows/deploy-wave-matrix.yml
git commit -m "feat(examples): 5 basic + deploy workflow examples

pr-check-node, pr-check-laravel, deploy-worker-simple,
deploy-worker-with-validation, deploy-wave-matrix. All standalone
(no internal reusables). Each has a header explaining purpose,
secrets needed, prerequisites."
```

---

### Task 6: `examples/workflows/` — advanced + notifications (4 files) + README

**Files:**
- Create: `examples/workflows/pr-check-issue-on-failure.yml`
- Create: `examples/workflows/pr-check-claude-fix.yml`
- Create: `examples/workflows/notify-webhook.yml`
- Create: `examples/workflows/notify-pushover.yml`
- Create: `examples/workflows/README.md`

- [ ] **Step 1: Create `examples/workflows/pr-check-issue-on-failure.yml`**

```yaml
# Example: PR check that creates a GitHub issue when checks fail.
#
# What it does:
#   - Runs tests (same as pr-check-node).
#   - If tests fail, creates or comments on a GitHub issue labeled
#     "ci-failure" with the PR link and run URL.
#
# Prerequisites:
#   - Repo has a label called "ci-failure" (created automatically on first
#     `gh issue create` if missing).
#   - `gh` CLI is available in the runner image (default Dockerfile has it).
#   - Token: GITHUB_TOKEN scope `issues: write` (via permissions block below).

name: PR Check (with issue on failure)

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  issues: write

jobs:
  test:
    name: Test
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  report-failure:
    name: Report failure as issue
    needs: test
    if: always() && needs.test.result == 'failure'
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - name: Open / comment on tracking issue
        env:
          GH_TOKEN:    ${{ secrets.GITHUB_TOKEN }}
          PR_URL:      ${{ github.event.pull_request.html_url }}
          PR_NUMBER:   ${{ github.event.pull_request.number }}
          RUN_URL:     ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          set -euo pipefail
          body="🔴 CI failure on PR #${PR_NUMBER}
          - PR: ${PR_URL}
          - Run: ${RUN_URL}"
          existing=$(gh issue list --label ci-failure --state open --json number --jq '.[0].number // empty')
          if [ -n "$existing" ]; then
            gh issue comment "$existing" --body "$body"
            echo "Appended to issue #$existing"
          else
            gh issue create \
              --title "🔴 CI failure on PR #${PR_NUMBER}" \
              --label ci-failure \
              --body "$body"
          fi
```

- [ ] **Step 2: Create `examples/workflows/pr-check-claude-fix.yml`**

```yaml
# Example: PR check that invokes Claude Code to auto-fix on failure.
#
# What it does:
#   - Runs tests (same as pr-check-node).
#   - If tests fail, dispatches the Claude Code action with a structured
#     prompt instructing Claude to read the failure logs and push a fix
#     commit to the PR branch.
#
# Prerequisites:
#   - CLAUDE_CODE_OAUTH_TOKEN secret (from Anthropic Console).
#   - Repo opted into anthropics/claude-code-action.
#   - Permissions: contents: write (to push fix commit), pull-requests: write,
#     issues: write, id-token: write, actions: read.

name: PR Check (Claude auto-fix)

on:
  pull_request:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write
  actions: read

jobs:
  test:
    name: Test
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  fix-with-claude:
    name: Ask Claude to fix
    needs: test
    if: always() && needs.test.result == 'failure'
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.event.pull_request.head.ref }}
          fetch-depth: 0

      - name: Build fix prompt
        id: prompt
        env:
          RUN_URL:    ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          PR_NUMBER:  ${{ github.event.pull_request.number }}
        run: |
          {
            echo "prompt<<EOF"
            echo "PR #${PR_NUMBER} failed in CI. Run logs: ${RUN_URL}"
            echo ""
            echo "Please:"
            echo "1. Use \`gh run view --log-failed\` to read the actual failure."
            echo "2. Identify the root cause."
            echo "3. Make the smallest possible fix and commit + push to this branch."
            echo "4. Do NOT add unrelated changes."
            echo "EOF"
          } >> "$GITHUB_OUTPUT"

      - name: Run Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: ${{ steps.prompt.outputs.prompt }}
          additional_permissions: |
            actions: read
```

- [ ] **Step 3: Create `examples/workflows/notify-webhook.yml`**

```yaml
# Example: Notify an HTTP webhook on success/failure of a deploy.
#
# What it does:
#   - Runs a deploy (replace with your real deploy logic).
#   - On success or failure, POSTs an HMAC-signed JSON payload to
#     NOTIFY_WEBHOOK_URL.
#
# Prerequisites:
#   - NOTIFY_WEBHOOK_URL secret: the destination endpoint.
#   - NOTIFY_WEBHOOK_SECRET secret: HMAC-SHA256 key the receiver uses to
#     verify the X-Signature header.

name: Deploy + webhook notify

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy
    runs-on: [self-hosted, cf-container]
    outputs:
      result: ${{ steps.set-result.outputs.result }}
    steps:
      - uses: actions/checkout@v5
      - name: Deploy
        id: do-deploy
        run: |
          # Replace this with your actual deploy command.
          echo "Pretend deploy succeeds"
      - name: Set result
        id: set-result
        if: always()
        run: echo "result=${{ steps.do-deploy.outcome }}" >> "$GITHUB_OUTPUT"

  notify:
    name: Notify webhook
    needs: deploy
    if: always()
    runs-on: [self-hosted, cf-container]
    steps:
      - name: POST signed payload
        env:
          NOTIFY_WEBHOOK_URL:    ${{ secrets.NOTIFY_WEBHOOK_URL }}
          NOTIFY_WEBHOOK_SECRET: ${{ secrets.NOTIFY_WEBHOOK_SECRET }}
          RESULT:                ${{ needs.deploy.outputs.result }}
          REPO:                  ${{ github.repository }}
          SHA:                   ${{ github.sha }}
          RUN_URL:               ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          set -euo pipefail
          payload=$(jq -nc \
            --arg repo "$REPO" \
            --arg sha  "$SHA" \
            --arg url  "$RUN_URL" \
            --arg res  "$RESULT" \
            '{repo:$repo, sha:$sha, run_url:$url, result:$res, timestamp: now|todate}')
          sig=$(printf '%s' "$payload" \
            | openssl dgst -sha256 -hmac "$NOTIFY_WEBHOOK_SECRET" -binary \
            | xxd -p -c 256)
          curl -fsSL -X POST "$NOTIFY_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -H "X-Signature: sha256=$sig" \
            --data "$payload"
          echo "Notified $NOTIFY_WEBHOOK_URL (result=$RESULT)"
```

- [ ] **Step 4: Create `examples/workflows/notify-pushover.yml`**

```yaml
# Example: Notify via Pushover on deploy failure.
#
# What it does:
#   - Runs a deploy (replace with your real deploy logic).
#   - On failure only, sends a Pushover push notification.
#
# Prerequisites:
#   - PUSHOVER_USER_KEY secret: your Pushover user key.
#   - PUSHOVER_APP_TOKEN secret: your Pushover application token.

name: Deploy + Pushover notify

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy
    runs-on: [self-hosted, cf-container]
    steps:
      - uses: actions/checkout@v5
      - name: Deploy
        run: |
          # Replace with your real deploy command.
          echo "Pretend deploy"

  notify-failure:
    name: Pushover on failure
    needs: deploy
    if: always() && needs.deploy.result == 'failure'
    runs-on: [self-hosted, cf-container]
    steps:
      - name: Send Pushover
        env:
          PUSHOVER_USER_KEY:  ${{ secrets.PUSHOVER_USER_KEY }}
          PUSHOVER_APP_TOKEN: ${{ secrets.PUSHOVER_APP_TOKEN }}
          REPO:               ${{ github.repository }}
          SHA:                ${{ github.sha }}
          RUN_URL:            ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          set -euo pipefail
          curl -fsSL -X POST https://api.pushover.net/1/messages.json \
            --form-string "token=$PUSHOVER_APP_TOKEN" \
            --form-string "user=$PUSHOVER_USER_KEY" \
            --form-string "title=🔴 Deploy failed: $REPO" \
            --form-string "message=Commit ${SHA:0:7} failed to deploy. Run: $RUN_URL" \
            --form-string "url=$RUN_URL" \
            --form-string "priority=1"
```

- [ ] **Step 5: Create `examples/workflows/README.md`**

Write `examples/workflows/README.md`:

```markdown
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
```

- [ ] **Step 6: Lint all workflow YAMLs**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
for f in examples/workflows/*.yml; do
  python3 -c "import yaml; yaml.safe_load(open('$f')); print('$f: OK')"
done
```

Expected: 9 OK lines.

- [ ] **Step 7: Commit**

```bash
git add examples/workflows/pr-check-issue-on-failure.yml \
        examples/workflows/pr-check-claude-fix.yml \
        examples/workflows/notify-webhook.yml \
        examples/workflows/notify-pushover.yml \
        examples/workflows/README.md
git commit -m "feat(examples): 4 advanced + notification workflows + README

pr-check-issue-on-failure, pr-check-claude-fix, notify-webhook
(HMAC-signed), notify-pushover. README lists all 9 examples with
trigger and purpose."
```

---

### Task 7: `docs/` — 3 markdown files

**Files:**
- Create: `docs/customization.md`
- Create: `docs/instance-types.md`
- Create: `docs/architecture.md`

- [ ] **Step 1: Create `docs/customization.md`**

Write `docs/customization.md`:

```markdown
# Customizing the runner image

The default `runner/Dockerfile` ships with Node 24 + pnpm + wrangler.
This page is a cookbook for the common additions/removals.

## Add a new system package

Append to any existing `apt-get install -y` block, or add a new RUN
layer near the top:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      imagemagick ghostscript \
 && rm -rf /var/lib/apt/lists/*
```

Then re-deploy. The first deploy after a Dockerfile change rebuilds and
re-uploads the image (~minutes); subsequent deploys are fast.

## Add a new language runtime

### Python

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
 && rm -rf /var/lib/apt/lists/* \
 && ln -sf /usr/bin/python3 /usr/local/bin/python
```

### Ruby

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      ruby ruby-dev rubygems \
 && rm -rf /var/lib/apt/lists/* \
 && gem install bundler
```

### Go (via tool cache, so setup-go finds it)

```dockerfile
ENV GO_VERSION=1.23.4
RUN mkdir -p "${RUNNER_TOOL_CACHE}/go/${GO_VERSION}/x64" \
 && curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" \
    | tar -xz -C "${RUNNER_TOOL_CACHE}/go/${GO_VERSION}/x64" --strip-components=1 \
 && touch "${RUNNER_TOOL_CACHE}/go/${GO_VERSION}/x64.complete" \
 && chown -R runner:runner "${RUNNER_TOOL_CACHE}/go"
```

The `RUNNER_TOOL_CACHE` is already exported at the top of the Dockerfile,
so `actions/setup-go@v5` will find this version.

## Add a database server

### PostgreSQL

See `examples/dockerfiles/php-postgresql.dockerfile`. The key parts:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      postgresql postgresql-contrib \
 && rm -rf /var/lib/apt/lists/* \
 && echo "dynamic_shared_memory_type = mmap" >> /etc/postgresql/16/main/postgresql.conf
```

The `mmap` setting is **required** because Cloudflare Containers doesn't
mount `/dev/shm`. Without it, Postgres fails with "could not open shared
memory segment".

In your workflow, start the cluster at job time:

```bash
sudo mkdir -p /var/run/postgresql
sudo chown postgres:postgres /var/run/postgresql
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl start \
     -D /var/lib/postgresql/16/main \
     -l /tmp/pg.log \
     -o "-c config_file=/etc/postgresql/16/main/postgresql.conf" \
     -w -t 30
```

(You can't use `service postgresql start` or `pg_ctlcluster` — both
require systemd/dbus, which isn't present in containers.)

### MySQL

See `examples/dockerfiles/php-mysql.dockerfile`. MySQL works the same
way — start with `mysqld --user=mysql &` and wait for the socket.

## Add browser dependencies (Playwright / Puppeteer)

See `examples/dockerfiles/playwright.dockerfile`. Playwright's installer
pulls in all required system libs:

```dockerfile
RUN npx -y playwright@1.50.0 install --with-deps chromium
```

If you need Firefox/WebKit too, pass them as arguments:

```dockerfile
RUN npx -y playwright@1.50.0 install --with-deps chromium firefox webkit
```

## Remove things from the default image

Don't deploy Cloudflare Workers? Drop wrangler:

```diff
-RUN npm install -g "pnpm@${PNPM_VERSION}" "wrangler@${WRANGLER_VERSION}" \
- && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/pnpm"    /usr/local/bin/pnpm \
- && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/wrangler" /usr/local/bin/wrangler \
- && chown -R runner:runner "${RUNNER_TOOL_CACHE}"
+RUN npm install -g "pnpm@${PNPM_VERSION}" \
+ && ln -sf "${RUNNER_TOOL_CACHE}/node/${NODE_VERSION}/${NODE_ARCH}/bin/pnpm" /usr/local/bin/pnpm \
+ && chown -R runner:runner "${RUNNER_TOOL_CACHE}"
```

Or use the prebuilt `examples/dockerfiles/node-only.dockerfile`.

## Change the GitHub Actions runner version

Pin a different version by editing the `ENV RUNNER_VERSION=` line:

```dockerfile
ENV RUNNER_VERSION=2.334.0
```

Latest releases: <https://github.com/actions/runner/releases>. The runner
agent is downloaded fresh in the build, so no other changes are needed.

## Verify your changes locally before deploy

```bash
docker build --platform=linux/amd64 -t my-runner-test ./runner
docker image ls my-runner-test
```

If you're on Apple Silicon, the build runs under QEMU emulation and can
take 5-10 minutes the first time. Subsequent builds reuse layers.
```

- [ ] **Step 2: Create `docs/instance-types.md`**

Write `docs/instance-types.md`:

```markdown
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
```

- [ ] **Step 3: Create `docs/architecture.md`**

Write `docs/architecture.md`:

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
git add docs/customization.md docs/instance-types.md docs/architecture.md
git commit -m "docs: customization cookbook, instance-types guide, architecture diagram"
```

---

### Task 8: Root README.md

**Files:**
- Modify: `README.md` (replaces the placeholder from Task 1)

This is the most important user-facing document. Hero + why-cheaper + cost table + setup overview + links to everything else.

- [ ] **Step 1: Overwrite `README.md` with the final version**

```markdown
# cloudflare-container-for-github-actions

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
```

Write this to `README.md` (overwriting the placeholder from Task 1).

- [ ] **Step 2: Commit**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
git add README.md
git commit -m "docs: final root README (hero, cost table, setup, links)"
```

---

### Task 9: Create GitHub repo + push

**Files:**
- (None modified — GitHub-side action only.)

- [ ] **Step 1: Confirm everything's committed locally**

```bash
cd /Volumes/Data/Projects/Neuralyn/cloudflare-container-for-github-actions
git status
git log --oneline
```

Expected: `git status` shows clean working tree; `git log` shows ~9 commits (one per task, including initial spec commit).

- [ ] **Step 2: Create the GitHub repo via `gh`**

```bash
gh repo create Neuralyn-AI/cloudflare-container-for-github-actions \
  --public \
  --description "Self-hosted GitHub Actions runners on Cloudflare Containers — cut your Actions bill by 40-98%." \
  --homepage "https://github.com/Neuralyn-AI/cloudflare-container-for-github-actions" \
  --source . \
  --remote origin \
  --push
```

Expected: repo created on GitHub, local `main` branch pushed.

- [ ] **Step 3: Verify the push**

```bash
gh repo view Neuralyn-AI/cloudflare-container-for-github-actions --web
```

This opens the new repo in a browser. Verify:
- README.md renders correctly (cost table, links).
- `runner/`, `examples/`, `docs/` directories all visible.
- LICENSE is detected as MIT (GitHub badge).

- [ ] **Step 4: Optional — tag v0.1.0**

```bash
git tag -a v0.1.0 -m "Initial public release"
git push origin v0.1.0
gh release create v0.1.0 \
  --title "v0.1.0 — Initial public release" \
  --notes "First public version of the runner.

- Worker + default Dockerfile (Node + pnpm + wrangler)
- 6 alternate Dockerfiles (node-only, php-postgres, php-mysql, elixir-phoenix-postgres, playwright)
- 9 standalone workflow examples
- README with cost comparison table (vs GitHub-hosted runners)

See README for setup and the cost breakdown."
```

- [ ] **Step 5: Done**

The repo is live. Optionally:
- Update the internal `cloudflare-deploy-github-actions/README.md` to
  point readers at the public version.
- Watch the first few external users / issues to surface unclear docs
  early.
