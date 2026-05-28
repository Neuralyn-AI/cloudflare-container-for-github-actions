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
