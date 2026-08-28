import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const environment = {
  ...process.env,
  VITE_API_BASE_URL: process.env.VITE_E2E_API_BASE_URL ?? process.env.VITE_API_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3210",
};

const spawnOptions = { stdio: "inherit", env: environment, shell: true };

const build = spawnSync(npmCommand, [ "run", "build" ], spawnOptions);
if (build.status !== 0) process.exit(build.status ?? 1);

const tests = spawnSync(npxCommand, [ "playwright", "test" ], spawnOptions);
process.exit(tests.status ?? 1);
