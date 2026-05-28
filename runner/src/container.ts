import { Container } from "@cloudflare/containers";

export class RunnerContainer extends Container {
  // Idle timeout — if the runner hangs after picking up its job,
  // the container is terminated to prevent runaway compute.
  sleepAfter = "5m";

  // Runner needs internet to reach api.github.com, download actions,
  // npm/pnpm registries, and the workflow's own targets.
  enableInternet = true;
}
