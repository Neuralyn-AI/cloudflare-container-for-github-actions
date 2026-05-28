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
