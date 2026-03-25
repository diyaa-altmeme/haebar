import { type Prisma } from "@prisma/client";
import Decimal from "decimal.js";

type AuditClient = Prisma.TransactionClient;

function serializeValue(value: unknown): unknown {
  if (value instanceof Decimal) {
    return value.toFixed(3);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)])
    );
  }

  return value;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return serializeValue(value) as Prisma.InputJsonValue;
}

export async function createAuditLog(
  tx: AuditClient,
  input: {
    entityType: string;
    entityId?: string | null;
    action: "create" | "update" | "delete" | "recalculate";
    actorId?: string | null;
    beforeData?: unknown;
    afterData?: unknown;
    metadata?: unknown;
  }
) {
  await tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      actorId: input.actorId ?? null,
      beforeData: input.beforeData ? toJsonValue(input.beforeData) : undefined,
      afterData: input.afterData ? toJsonValue(input.afterData) : undefined,
      metadata: input.metadata ? toJsonValue(input.metadata) : undefined
    }
  });
}
