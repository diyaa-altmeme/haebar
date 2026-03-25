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

// Support both local and remote (Supabase) connections
const isSupabase = connectionString.includes('supabase.com');
let sslConfig: any = { rejectUnauthorized: false };

if (!isSupabase) {
  // For local PostgreSQL, we can skip SSL
  sslConfig = false;
}

const pool = new Pool({ 
  connectionString,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
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
