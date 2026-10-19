import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { beforeEach, afterEach } from "vitest";

beforeEach(() => { window.history.replaceState(null, "", "/"); window.localStorage?.clear(); });

afterEach(() => {
  cleanup();
});
