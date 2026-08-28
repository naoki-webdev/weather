import { execSync } from "node:child_process";

export default async function globalTeardown() {
  if (process.env.PLAYWRIGHT_SKIP_DOCKER === "1") return;
  execSync("docker compose stop e2e_web e2e_stub", { stdio: "inherit" });
}
