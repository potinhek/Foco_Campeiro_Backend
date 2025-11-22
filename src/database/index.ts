import { PrismaClient } from "@prisma/client";
import { auditPrismaMiddleware } from "./prismaMiddleware";

export const prisma = new PrismaClient
prisma.$use(auditPrismaMiddleware);
