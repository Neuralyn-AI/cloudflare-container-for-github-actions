import type { RunnerContainer } from "./container.js";

export type Env = {
  RUNNER: DurableObjectNamespace<RunnerContainer>;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
};

export type WorkflowJobEvent = {
  action: "queued" | "in_progress" | "completed" | "waiting";
  workflow_job: {
    id: number;
    name: string;
    labels: string[];
    status: string;
  };
  repository: {
    name: string;
    owner: { login: string };
  };
  installation: { id: number };
};

export type DispatchDecision =
  | {
      dispatch: true;
      jobId: number;
      installationId: number;
      owner: string;
      repo: string;
    }
  | { dispatch: false; reason: "wrong_event" | "not_queued" | "label_missing" };
