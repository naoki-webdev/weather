import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import LoginPage from "./LoginPage";

describe("LoginPage", () => {
  test("submits values populated by browser autofill", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<LoginPage error={null} onSubmit={onSubmit} />);

    const email = screen.getByRole("textbox", { name: "メールアドレス" });
    const password = screen.getByLabelText("パスワード", { exact: false });
    const form = screen.getByRole("button", { name: "ログイン" }).closest("form");

    expect(form).not.toBeNull();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(email, "demo@example.com");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(password, "password");

    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("demo@example.com", "password");
    });
  });
});
