import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Avoid creating many Prisma clients in dev (hot reload).
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__haebar_prisma__ || new PrismaClient();

globalForPrisma.__haebar_prisma__ = prisma;

export { prisma };

