import { describe, it, expect } from "vitest";
import { createAppJwt } from "../src/github-app.js";

// Test RSA private key in PKCS#8 PEM format (DO NOT use in production).
// Generated locally with: openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5Gp3kKO9YUMpD
FaR0GKTEoEy6VuQ+7VXYmBKVPIKvk1NRhZKe9kNUlB5MW/l3O6M/9vIU3nuh/ies
xQ9bYsJlO/cFhlozaOkcGPHPvea9paZR7x06kM8putRiPs01Xdw4Z3Ek/yeuwXEo
sVLmtX6MKNykBinP47p7XZIfuNmiz8yK0j4WyqKx6SkZlwAjGj27tgt9T+4fO+OY
tWbB0lofIZTN+Ejky63wwH7HI/EJNFgAgCEinZbbTuubwONV2uXeTTLFW9LrVzw6
X3ychqbMqqdiNTPgFgGEcOEKsasAggoN7h2LZEXCbVWVVBXlpHohr2wm26fVnW3W
Ouxg1+v5AgMBAAECggEABuVUc38I55/e4R/px/9xB/g204xQJX3/ADouGwwtjC/v
Xy6cNzrSaFC6Tjrw8L2yh7wB6cAeF/tZbAjNWSi1OENDIRwPuTGT2Z2eSJB5C6Cj
sRK44okphpL0vZI8X9wWy60i3G97AXooZo0wmvKw+7S7/4pRPXLs7BKg0ni29uc5
lNm+mi5k6QoYCRVhJxP9EhFyiHc0MhpG+3R3in2WPR1ne9XNyWnzO4zdIn9nbBW9
qd/zPjQLL8CyTmsQwfeU1vzz9zqa6m9gaATQD4y5QLJr9Jx+Je8PS0bzjRFBQnou
QjegN8HuTqmbAo3ChJkH93yPaXJr18zNThjyAX+QFwKBgQDy63ibL8ej6hQ+NSaW
bdHIZlinw36d1fAYHtDvABU0Xydg9lRJSuFlblfJZ9AcWUAKUX6YaAlWIpgCeu9F
4JxL+2ynOVPl6gHxgwqxvrhC0HVCqAlPOLdKc1OR/BHqKX0gWklfW9txTSKbyRVM
YTccyL21nLbmg2bNe2yL5D7/4wKBgQDDEi7cbB+pwFWQpbFzJj96Ttyr0mGF1ZfO
BUz0bqEFzQRCE8vh56OmJMPBIWhJIN1QgKYW5OjvAnBWh+c/tylw4ZaTZFYhozJJ
kt8jbgCi2m1r9WtNaQNCRu5aONkS6nnMxdkE6/DWfjauP0s0bjFvHkaaR+TDms8t
ZLBF6YhzcwKBgQCRQDFOgcRbA7V0+O0I18Ovk1sBfUixceHtWkfOEPuc5CS0urXt
WUPrFY6SVGvA97DuOop68QJcKbVBDmcSHlr2p/DxELtU55af5Z44Z/Tfpqvm3nkq
kJwwfUMEMHg5zvMNrE7hIRjW56uBATyl/h8pK/MbrAhFT17iESH3h9QPxwKBgFbE
nMGA+qiIG8dGXGMKzUt7Dp8C6kwckPSb2PoUx10ML2uw4Ixwe5NoYQZj9L4qdyba
woYGdjHyFMP4mXz23OEQBukyxTkbHUAqq0RYJsJJhEh0FrGNF10Arf7FsJDAaUMT
cg/FXxAZffsNvkbpCOYTQnZXqkLzdloLonjGguJPAoGACyyBs9IR1hhq/BHAGlKD
IkwRaFAMVLOqkZQMrVWqR84gME12GdqACRL3d3y3mXLEIEZFRKGHXFkkL8xQwmJT
WJRE6MeFXglzPx/jUC7RYuiuNgwlwXLFomm4f8F2LkSIi3QK113g4abqvZOVjSYV
B+WDvWgbSIRThtrGk9DxlA0=
-----END PRIVATE KEY-----`;

describe("createAppJwt", () => {
  it("produces a JWT with three base64url segments", async () => {
    const jwt = await createAppJwt("123456", TEST_PRIVATE_KEY);
    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p))).toBe(true);
  });

  it("encodes iss=appId, alg=RS256, and expiry within 10 minutes", async () => {
    const jwt = await createAppJwt("123456", TEST_PRIVATE_KEY);
    const [headerB64, payloadB64] = jwt.split(".");
    const decode = (s: string) =>
      JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));
    expect(decode(headerB64!)).toEqual({ alg: "RS256", typ: "JWT" });
    const payload = decode(payloadB64!);
    expect(payload.iss).toBe("123456");
    const now = Math.floor(Date.now() / 1000);
    expect(payload.iat).toBeLessThanOrEqual(now);
    expect(payload.exp).toBeGreaterThan(now);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(600);
  });
});

import { vi, beforeEach, afterEach } from "vitest";
import { getInstallationToken, createJitConfig } from "../src/github-app.js";

describe("getInstallationToken", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to /app/installations/{id}/access_tokens and returns the token", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ token: "ghs_abc123" }), { status: 201 }),
    );
    const token = await getInstallationToken("jwt.value.here", 42);
    expect(token).toBe("ghs_abc123");
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls as any[];
    const [url, init] = calls[0];
    expect(url).toBe("https://api.github.com/app/installations/42/access_tokens");
    expect((init as any).method).toBe("POST");
    expect((init as any).headers.Authorization).toBe("Bearer jwt.value.here");
  });

  it("throws on non-2xx response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("nope", { status: 401 }),
    );
    await expect(getInstallationToken("jwt", 42)).rejects.toThrow(/401/);
  });
});

describe("createJitConfig", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to generate-jitconfig with the expected body and returns encoded_jit_config", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ encoded_jit_config: "eyJjb25maWci..." }), {
        status: 201,
      }),
    );
    const config = await createJitConfig("ghs_token", "Neuralyn-AI", "dashboard", 999);
    expect(config).toBe("eyJjb25maWci...");
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls as any[];
    const [url, init] = calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/Neuralyn-AI/dashboard/actions/runners/generate-jitconfig",
    );
    const body = JSON.parse((init as any).body);
    expect(body.name).toBe("ci-999");
    expect(body.labels).toEqual(["self-hosted", "cf-container"]);
    expect(body.runner_group_id).toBe(1);
    expect(body.work_folder).toBe("_work");
    expect((init as any).headers.Authorization).toBe("Bearer ghs_token");
  });

  it("throws on non-2xx response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("forbidden", { status: 403 }),
    );
    await expect(createJitConfig("t", "o", "r", 1)).rejects.toThrow(/403/);
  });
});
