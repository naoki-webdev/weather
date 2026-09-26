import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteSession, fetchCurrentSession } from "../api/session";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/session", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  fetchCurrentSession: vi.fn(),
}));

function AuthState() {
  const { user, error, signOut } = useAuth();
  return <div><span>{user?.name ?? "anonymous"}</span>{error && <span role="alert">{error}</span>}<button onClick={() => void signOut()}>sign out</button></div>;
}

describe("AuthContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the current user when logout fails", async () => {
    vi.mocked(fetchCurrentSession).mockResolvedValue({ user: { id: 1, name: "太郎", email: "taro@example.com", read_only: false } });
    vi.mocked(deleteSession).mockRejectedValue(new Error("network error"));
    render(<AuthProvider><AuthState /></AuthProvider>);

    await waitFor(() => expect(screen.getByText("太郎")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ログアウトに失敗しました。");
    expect(screen.getByText("太郎")).toBeInTheDocument();
  });
});
