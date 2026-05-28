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
