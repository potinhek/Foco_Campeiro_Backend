import { PrismaClient } from "@prisma/client";
import { auditExtension } from "./prismaMiddleware";

// Cria o cliente bruto
const prismaClient = new PrismaClient();

// Exporta o cliente JÁ COM A EXTENSÃO aplicada
// Isso substitui o antigo 'prisma.$use(...)'
export const prisma = prismaClient.$extends(auditExtension);