import type { ConfigService } from "@nestjs/config";
import type { User } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService token sessions", () => {
  const user = {
    id: 1n,
    name: "デモユーザー",
    email: "demo@example.com",
    passwordDigest: "",
    readOnly: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  } as User;

  it("persists a session and requires it when reading a token", async () => {
    user.passwordDigest = await bcrypt.hash("password", 4);
    const authSession = {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn().mockResolvedValue({ revokedAt: null, expiresAt: new Date(Date.now() + 60_000) }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      authSession,
    } as unknown as PrismaService;
    const config = { getOrThrow: jest.fn().mockReturnValue("test-secret") } as unknown as ConfigService;
    const service = new AuthService(prisma, config);

    const result = await service.authenticate("demo@example.com", "password");

    expect(result?.token).toEqual(expect.any(String));
    expect(authSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 1n, jti: expect.any(String), expiresAt: expect.any(Date) }),
    });
    expect(authSession.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: expect.any(Date) } } });
    await expect(service.fromToken(result!.token)).resolves.toEqual(user);

    await service.revokeToken(result!.token);
    expect(authSession.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ jti: expect.any(String), revokedAt: null }),
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects a token whose persisted session is revoked or expired", async () => {
    const authSession = {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ revokedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) }),
      updateMany: jest.fn(),
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      authSession,
    } as unknown as PrismaService;
    const config = { getOrThrow: jest.fn().mockReturnValue("test-secret") } as unknown as ConfigService;
    const service = new AuthService(prisma, config);
    const token = await (service as unknown as { issueToken: (id: bigint) => Promise<string> }).issueToken(user.id);

    await expect(service.fromToken(token)).resolves.toBeNull();
  });
});
