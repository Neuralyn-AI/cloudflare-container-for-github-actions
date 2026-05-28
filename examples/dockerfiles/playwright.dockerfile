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
