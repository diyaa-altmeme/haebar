import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

let connectionString = process.env.DATABASE_URL || "";
if (connectionString.startsWith('"') && connectionString.endsWith('"')) {
  connectionString = connectionString.slice(1, -1);
} else if (connectionString.startsWith("'") && connectionString.endsWith("'")) {
  connectionString = connectionString.slice(1, -1);
}

// Remove sslmode=require from connection string to avoid overriding ssl config
connectionString = connectionString.replace('?schema=public&sslmode=require', '?schema=public');
connectionString = connectionString.replace('&sslmode=require', '');
connectionString = connectionString.replace('?sslmode=require', '');

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool as any);

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
