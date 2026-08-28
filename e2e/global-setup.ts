import { execSync } from "node:child_process";
import * as http from "node:http";

function request(url: string) {
  return new Promise<number>((resolve, reject) => {
    const req = http.get(url, (response) => {
      resolve(response.statusCode ?? 500);
      response.resume();
    });

    req.on("error", reject);
  });
}

async function waitForServer(url: string, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const status = await request(url);
      if (status >= 200 && status < 400) return;
    } catch {
      // Wait for the containerized NestJS server to boot.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Server did not become ready: ${url}`);
}

export default async function globalSetup() {
  // Set PLAYWRIGHT_SKIP_DOCKER=1 when the server / seed are managed outside of Playwright
  // (e.g. running tests inside a container that does not have the docker CLI available).
  if (process.env.PLAYWRIGHT_SKIP_DOCKER !== "1") {
    execSync("docker compose up -d --build db e2e_web", { stdio: "inherit" });
  }
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3210";
  await waitForServer(`${baseUrl}/up`);
}
