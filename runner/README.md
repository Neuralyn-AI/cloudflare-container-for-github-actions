# GitHub Container Runner

Cloudflare Worker + Container that runs ephemeral self-hosted GitHub Actions runners
for the `<your-org>` org. See `../docs/architecture.md`
for the design.

## First-time setup

### 1. Create the GitHub App

In `https://github.com/organizations/<your-org>/settings/apps`, click **New GitHub App**.

| Field | Value |
|---|---|
| Name | `GitHub Container Runner Dispatcher` |
| Homepage URL | https://github.com/<your-org>/cloudflare-container-for-github-actions |
| Webhook URL | `https://neuralyn-github-container-runner.<your-subdomain>.workers.dev/webhook` |
| Webhook secret | generate with `openssl rand -hex 32` — keep it; needed in step 3 |
| Repository permissions | Actions: read; Administration: read+write; Metadata: read |
| Subscribe to events | Workflow job |
| Where can this be installed? | Only on this account |

After creating: **Generate a private key** and download the `.pem` file. Note the App ID at the top of the page.

> **Important — PEM format**: GitHub's downloaded key uses PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`). The Worker expects PKCS#8 (`-----BEGIN PRIVATE KEY-----`). Convert before pasting in step 3:
>
> ```bash
> openssl pkcs8 -topk8 -in downloaded-from-github.pem -out app-pkcs8.pem -nocrypt
> ```
>
> Paste the contents of `app-pkcs8.pem` (including BEGIN/END lines) when prompted by `wrangler secret put GITHUB_APP_PRIVATE_KEY`.

Then install the App: click **Install App** in the sidebar → choose `<your-org>` → All repositories (or selective).

### 2. Initial Worker deploy (creates the DNS entry the webhook needs)

```bash
cd runner
pnpm install
pnpm exec wrangler deploy
```

The first deploy uploads the container image to Cloudflare's registry and provisions the DO + Container. Subsequent deploys reuse the image layers.

### 3. Set Worker secrets

```bash
pnpm exec wrangler secret put GITHUB_APP_ID          # paste the numeric App ID
pnpm exec wrangler secret put GITHUB_APP_PRIVATE_KEY # paste the entire PEM, including BEGIN/END lines
pnpm exec wrangler secret put GITHUB_WEBHOOK_SECRET  # paste the secret from step 1
```

### 4. Update the App's Webhook URL if it changed

If the deploy assigned a different subdomain than you predicted in step 1, update the Webhook URL in the App settings to match the actual Worker URL.

## Operate

- **Logs:** Cloudflare Dashboard → Workers → `neuralyn-github-container-runner` → Logs (live tail).
- **Container status:** Cloudflare Dashboard → Workers → Containers → `RunnerContainer`.
- **Redeploy after code changes:** `pnpm exec wrangler deploy`.
- **Redeploy after Dockerfile changes:** same command — Wrangler rebuilds and pushes the image.

## Architecture

See the design spec linked at the top.
