import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  jwtRefreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? "30"),
  cookieDomain: process.env.COOKIE_DOMAIN ?? "localhost",
};
