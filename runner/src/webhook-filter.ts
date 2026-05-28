import type { DispatchDecision, WorkflowJobEvent } from "./types.js";

const REQUIRED_LABEL = "cf-container";

export function decideDispatch(
  event: string | null,
  payload: WorkflowJobEvent,
): DispatchDecision {
  if (event !== "workflow_job") {
    return { dispatch: false, reason: "wrong_event" };
  }
  if (payload.action !== "queued") {
    return { dispatch: false, reason: "not_queued" };
  }
  if (!payload.workflow_job.labels.includes(REQUIRED_LABEL)) {
    return { dispatch: false, reason: "label_missing" };
  }
  return {
    dispatch: true,
    jobId: payload.workflow_job.id,
    installationId: payload.installation.id,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
  };
}
