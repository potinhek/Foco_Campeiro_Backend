// src/config/jwt.ts
import * as jwt from "jsonwebtoken";
import { env } from "./env";

type AccessPayload = { sub: string; role: string };
type RefreshPayload = { sub: string; sid: string };

const ALG: jwt.Algorithm = "HS256";

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret as jwt.Secret, {
    algorithm: ALG,
    expiresIn: env.jwtAccessExpires as jwt.SignOptions["expiresIn"], // "15m"
  });
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret as jwt.Secret, {
    algorithm: ALG,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwtAccessSecret as jwt.Secret) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.jwtRefreshSecret as jwt.Secret) as RefreshPayload;
}
