function base64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPkcs8PrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    bin.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function createAppJwt(
  appId: string,
  privateKeyPem: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };

  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = await importPkcs8PrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(data),
  );
  return `${data}.${base64url(sig)}`;
}

const GH_API = "https://api.github.com";
const COMMON_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "neuralyn-ci-runner",
};

export async function getInstallationToken(
  appJwt: string,
  installationId: number,
): Promise<string> {
  const res = await fetch(
    `${GH_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${appJwt}` },
    },
  );
  if (!res.ok) {
    throw new Error(`installation token mint failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function createJitConfig(
  installationToken: string,
  owner: string,
  repo: string,
  jobId: number,
): Promise<string> {
  const res = await fetch(
    `${GH_API}/repos/${owner}/${repo}/actions/runners/generate-jitconfig`,
    {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        Authorization: `Bearer ${installationToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `ci-${jobId}`,
        runner_group_id: 1,
        labels: ["self-hosted", "cf-container"],
        work_folder: "_work",
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`jit config mint failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { encoded_jit_config: string };
  return data.encoded_jit_config;
}
