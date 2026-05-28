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
