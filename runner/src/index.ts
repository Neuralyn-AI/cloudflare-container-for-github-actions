import { getContainer } from "@cloudflare/containers";
import { verifySignature } from "./hmac.js";
import { decideDispatch } from "./webhook-filter.js";
import {
  createAppJwt,
  getInstallationToken,
  createJitConfig,
} from "./github-app.js";
import type { Env, WorkflowJobEvent } from "./types.js";

export { RunnerContainer } from "./container.js";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }
    if (new URL(req.url).pathname !== "/webhook") {
      return new Response("not found", { status: 404 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    if (!(await verifySignature(env.GITHUB_WEBHOOK_SECRET, body, signature))) {
      console.log({ event: "webhook_signature_invalid" });
      return new Response("invalid signature", { status: 401 });
    }

    const eventType = req.headers.get("x-github-event");
    let payload: WorkflowJobEvent;
    try {
      payload = JSON.parse(body) as WorkflowJobEvent;
    } catch {
      return new Response("invalid json", { status: 400 });
    }

    const decision = decideDispatch(eventType, payload);
    if (!decision.dispatch) {
      console.log({ event: "event_filtered", reason: decision.reason });
      // 204 No Content: spec forbids a body; passing a string crashes the Workers runtime.
      return new Response(null, { status: 204 });
    }

    try {
      const jwt = await createAppJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY);
      const instToken = await getInstallationToken(jwt, decision.installationId);
      const jitConfig = await createJitConfig(
        instToken,
        decision.owner,
        decision.repo,
        decision.jobId,
      );

      const container = getContainer(env.RUNNER, String(decision.jobId));
      await container.start({
        envVars: { RUNNER_JITCONFIG: jitConfig },
        enableInternet: true,
      });

      console.log({
        event: "container_dispatched",
        jobId: decision.jobId,
        repo: `${decision.owner}/${decision.repo}`,
      });
      return new Response("dispatched", { status: 202 });
    } catch (err) {
      console.log({
        event: "dispatch_error",
        message: err instanceof Error ? err.message : String(err),
      });
      return new Response("dispatch failed", { status: 500 });
    }
  },
};
