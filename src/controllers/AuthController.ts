
import { Handler } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../database";
import { HttpError } from "../errors/HttpsError";
import { env } from "../config/env";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../config/jwt";

import { z } from "zod";
import { UserRole } from "@prisma/client";
const RegisterSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    cpf: z.string().regex(/^\d{11}$/),
    phone: z.string().regex(/^\d{10,11}$/),
    password: z.string().min(6),

});
const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const REFRESH_COOKIE = "rtok";

function setRefreshCookie(res: any, token: string, expiresAt: Date) {
    res.cookie(REFRESH_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.nodeEnv === "production",
        domain: env.cookieDomain,
        expires: expiresAt,
        path: "/auth",
    });
}

function toPublicUser(u: any) {

    const { password, passwordHash, ...rest } = u;
    return rest;
}

export class AuthController {
    /**
     * Auto-cadastro (sempre cria com role "user"), já retorna tokens.
     * Se você não quiser auto-cadastro público, proteja essa rota ou remova-a.
     */
    register: Handler = async (req, res, next) => {
        try {
            const data = RegisterSchema.parse(req.body);


            const role = UserRole.client;


            const passwordHash = await bcrypt.hash(data.password, 10);

            const newUser = await prisma.users.create({
                data: {
                    name: data.name,
                    email: data.email,
                    cpf: data.cpf,
                    phone: data.phone,
                    password: passwordHash,
                    role,
                },
            });


            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Number(env.jwtRefreshExpiresDays || 30));
            const session = await prisma.sessions.create({
                data: {
                    userId: newUser.id,
                    expiresAt,
                },
            });

            const accessToken = signAccessToken({ sub: String(newUser.id), role });
            const refreshToken = signRefreshToken({ sub: String(newUser.id), sid: session.id });

            setRefreshCookie(res, refreshToken, expiresAt);
            res.status(201).json({
                user: toPublicUser(newUser),
                accessToken,
                sessionId: session.id,
            });
        } catch (error: any) {
            if (error?.code === "P2002" && error?.meta?.target?.includes("email")) {
                return next(new HttpError(409, "E-mail já cadastrado"));
            }
            next(error);
        }
    };

    /**
     * Login: retorna accessToken e seta refreshToken (httpOnly cookie).
     * Formato igual ao que você pediu.
     */
    login: Handler = async (req, res) => {
        try {
            const { email, password } = LoginSchema.parse(req.body);

            const user = await prisma.users.findUnique({ where: { email } });
            if (!user) throw new HttpError(401, "Credenciais inválidas");


            const storedHash: string | undefined = (user as any).password ?? (user as any).passwordHash;
            if (!storedHash) throw new HttpError(500, "Configuração de senha inválida no usuário");

            const ok = await bcrypt.compare(password, storedHash);
            if (!ok) throw new HttpError(401, "Credenciais inválidas");

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Number(env.jwtRefreshExpiresDays || 30));

            const session = await prisma.sessions.create({
                data: {
                    userId: user.id,
                    userAgent: req.get("user-agent") ?? undefined,
                    ipAdress: req.ip,
                    expiresAt,
                },
            });

            const accessToken = signAccessToken({ sub: String(user.id), role: user.role });
            const refreshToken = signRefreshToken({ sub: String(user.id), sid: session.id });

            setRefreshCookie(res, refreshToken, expiresAt);
            res.json({
                user: toPublicUser(user),
                accessToken,
                sessionId: session.id,
            });
        } catch (err: any) {
            res.status(401).json({ message: err?.message ?? "Não autorizado" });
        }
    };

    /**
     * Refresh: usa o cookie httpOnly, valida a sessão e ROTACIONA.
     */
    refresh: Handler = async (req, res, next) => {
        try {
            const token = req.cookies?.[REFRESH_COOKIE];
            if (!token) throw new HttpError(401, "Refresh ausente");

            const { sub, sid } = verifyRefreshToken(token);
            const userId = String(sub);

            const session = await prisma.sessions.findUnique({ where: { id: sid } });
            if (!session || session.isRevoked || session.userId !== userId) {
                throw new HttpError(401, "Sessão inválida");
            }
            if (session.expiresAt <= new Date()) {
                throw new HttpError(401, "Sessão expirada");
            }

            const user = await prisma.users.findUniqueOrThrow({ where: { id: String(userId) } });


            await prisma.sessions.update({ where: { id: sid }, data: { isRevoked: true } });
            const newSession = await prisma.sessions.create({
                data: {
                    userId,
                    expiresAt: session.expiresAt,
                },
            });

            const accessToken = signAccessToken({ sub: String(user.id), role: user.role });
            const newRefreshToken = signRefreshToken({ sub: String(user.id), sid: newSession.id });

            setRefreshCookie(res, newRefreshToken, newSession.expiresAt);
            res.json({ accessToken, sessionId: newSession.id });
        } catch (err) {
            next(err);
        }
    };

    /**
     * Logout: revoga a sessão atual (do cookie) e limpa o cookie.
     */
    logout: Handler = async (req, res, next) => {
        try {
            const token = req.cookies?.[REFRESH_COOKIE];
            if (token) {
                const { sid } = verifyRefreshToken(token);
                await prisma.sessions.updateMany({
                    where: { id: sid, isRevoked: false },
                    data: { isRevoked: true },
                });
            }
            res.clearCookie(REFRESH_COOKIE, { domain: env.cookieDomain, path: "/auth" });
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    };
}
