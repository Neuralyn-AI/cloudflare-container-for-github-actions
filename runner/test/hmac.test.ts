import { describe, it, expect } from "vitest";
import { verifySignature } from "../src/hmac.js";

describe("verifySignature", () => {
  const secret = "It's a Secret to Everybody";
  const body = "Hello, World!";
  // sha256 HMAC of body with secret (from GitHub docs example):
  // https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
  const validSig = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";

  it("returns true for a matching signature", async () => {
    expect(await verifySignature(secret, body, validSig)).toBe(true);
  });

  it("returns false for a tampered signature", async () => {
    const tampered = validSig.slice(0, -1) + "0";
    expect(await verifySignature(secret, body, tampered)).toBe(false);
  });

  it("returns false for a tampered body", async () => {
    expect(await verifySignature(secret, body + "!", validSig)).toBe(false);
  });

  it("returns false when header is empty", async () => {
    expect(await verifySignature(secret, body, "")).toBe(false);
  });

  it("returns false when header has wrong prefix", async () => {
    expect(await verifySignature(secret, body, "sha1=" + validSig.slice(7))).toBe(false);
  });
});
