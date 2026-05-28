import { describe, it, expect } from "vitest";
import { decideDispatch } from "../src/webhook-filter.js";
import type { WorkflowJobEvent } from "../src/types.js";
import fixtureRaw from "./fixtures/workflow_job_queued.json" with { type: "json" };

const fixture = fixtureRaw as WorkflowJobEvent;

describe("decideDispatch", () => {
  it("dispatches when action=queued and label cf-container is present", () => {
    expect(decideDispatch("workflow_job", fixture)).toEqual({
      dispatch: true,
      jobId: 123456789,
      installationId: 42,
      owner: "Neuralyn-AI",
      repo: "neuralyn-customer-dashboard",
    });
  });

  it("ignores non-workflow_job events", () => {
    expect(decideDispatch("push", fixture)).toEqual({ dispatch: false, reason: "wrong_event" });
  });

  it("ignores non-queued actions", () => {
    const p: WorkflowJobEvent = { ...fixture, action: "completed" };
    expect(decideDispatch("workflow_job", p)).toEqual({ dispatch: false, reason: "not_queued" });
  });

  it("ignores jobs without cf-container label", () => {
    const p: WorkflowJobEvent = {
      ...fixture,
      workflow_job: { ...fixture.workflow_job, labels: ["self-hosted"] },
    };
    expect(decideDispatch("workflow_job", p)).toEqual({ dispatch: false, reason: "label_missing" });
  });
});
