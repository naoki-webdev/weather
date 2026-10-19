import { act, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useQueryState } from "./useQueryState";

describe("URL state", () => {
  it("restores browser history and rejects malformed state", () => {
    window.history.replaceState(null, "", "/?page=-2");
    const { result } = renderHook(() => useQueryState("page", 1, (v): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](3));
    expect(new URL(window.location.href).searchParams.get("page")).toBe("3");
    act(() => { window.history.replaceState(null, "", "/?page=2"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(result.current[0]).toBe(2);
    act(() => { window.history.replaceState(null, "", "/?page=%7B"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(result.current[0]).toBe(1);
  });
});
