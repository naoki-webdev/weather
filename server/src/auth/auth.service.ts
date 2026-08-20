import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { User } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

import { PrismaService } from "../prisma.service";

type TokenPayload = { userId: string; jti: string };

const TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async authenticate(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordDigest))) return null;

    return { user: this.publicUser(user), token: await this.issueToken(user.id) };
  }

  async fromToken(token: string) {
    try {
      const payload = jwt.verify(token, this.secret()) as TokenPayload;
      if (!payload.userId || !payload.jti) return null;
      const session = await this.prisma.authSession.findUnique({ where: { jti: payload.jti } });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
      return this.prisma.user.findUnique({ where: { id: BigInt(payload.userId) } });
    } catch {
      return null;
    }
  }

  async revokeToken(token: string) {
    try {
      const payload = jwt.verify(token, this.secret()) as Partial<TokenPayload>;
      if (!payload.jti) return;
      await this.prisma.authSession.updateMany({
        where: { jti: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // AuthGuard already rejects invalid tokens. Keep logout idempotent if a token expires between the guard and this call.
    }
  }

  publicUser(user: User) {
    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      read_only: user.readOnly,
    };
  }

  private async issueToken(userId: bigint) {
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
    await this.prisma.authSession.create({ data: { userId, jti, expiresAt } });
    return jwt.sign({ userId: userId.toString(), jti }, this.secret(), { expiresIn: TOKEN_TTL_SECONDS });
  }

  private secret() {
    return this.config.getOrThrow<string>("JWT_SECRET");
  }
}
