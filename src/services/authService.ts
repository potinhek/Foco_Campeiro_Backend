import { prisma } from "../database";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { env } from "../config/env";
import { signAccessToken, signRefreshToken } from "../config/jwt";
import { UserRole } from "@prisma/client";

type RegisterParams = { name: string; email: string; password: string; role?: string };
type LoginParams = { email: string; password: string; userAgent?: string; ip?: string };

export const authService = {
  async register(params: RegisterParams) {
    const exists = await prisma.users.findUnique({ where: { email: params.email } });
    if (exists) throw new Error("E-mail já cadastrado");

    const password = await bcrypt.hash(params.password, 10);
    const user = await prisma.users.create({
      data: {
        name: params.name,
        email: params.email,
        password,
        role: UserRole.admin,
      },
    });

    return user;
  },

  async login(params: LoginParams) {
    const user = await prisma.users.findUnique({ where: { email: params.email } });
    if (!user) throw new Error("Credenciais inválidas");

    const ok = await bcrypt.compare(params.password, user.password);
    if (!ok) throw new Error("Credenciais inválidas");

    // cria sessão (refresh) com expiração e metadados
    const expiresAt = addDays(new Date(), env.jwtRefreshExpiresDays);
    const session = await prisma.sessions.create({
      data: {
        userId: user.id,
        userAgent: params.userAgent,
        ipAdress: params.ip,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, sid: session.id });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      sessionId: session.id,
    };
  },

  async refresh(refreshToken: string) {
    // valida token e busca sessão
    const { sub: userId, sid } = (await import("../config/jwt")).verifyRefreshToken(refreshToken);
    const session = await prisma.sessions.findUnique({ where: { id: sid } });
    if (!session || session.isRevoked || session.userId !== userId) {
      throw new Error("Sessão inválida");
    }
    if (session.expiresAt <= new Date()) {
      throw new Error("Sessão expirada");
    }

    const user = await prisma.users.findUniqueOrThrow({ where: { id: userId } });

    // ROTATION: invalida a sessão antiga e cria uma nova
    await prisma.sessions.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const newSession = await prisma.sessions.create({
      data: {
        userId,
        userAgent: undefined,
        ipAdress: undefined,
        expiresAt: new Date(session.expiresAt), // mantém a mesma janela ou use addDays(...)
      },
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ sub: user.id, sid: newSession.id });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: newSession.id,
      refreshExpiresAt: newSession.expiresAt,
    };
  },

  async logout(sessionId: string) {
    await prisma.sessions.updateMany({
      where: { id: sessionId, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  async revokeAll(userId: string) {
    await prisma.sessions.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },
};
