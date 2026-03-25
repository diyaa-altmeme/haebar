import { ok } from "@/lib/api/http";

export async function GET() {
  return ok({
    status: "ok",
    stack: "nextjs-typescript-prisma-supabase-ready"
  });
}
