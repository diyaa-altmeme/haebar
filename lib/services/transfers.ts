import { z } from "zod";

import { cacheRemember } from "@/lib/cache";
import { invalidateFinancialPeriodCaches } from "@/lib/cache/financial";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log";
import { recalculateBoxBalancesForPeriod } from "@/lib/services/box-balances";

const transferSchema = z.object({
  fromBox: z.enum(["cash", "master", "swish", "sagi", "other_elec", "bank"]),
  toBox: z.enum(["cash", "master", "swish", "sagi", "other_elec", "bank"]),
  amount: z.union([z.string(), z.number()]),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional().nullable()
});

export async function listTransfers(month: number, year: number) {
  return cacheRemember(`transfers:${year}:${month}`, 300, async () => {
    const transfers = await prisma.boxTransfer.findMany({
      where: { month, year },
      orderBy: [{ transferDate: "desc" }, { createdAt: "desc" }]
    });

    return transfers.map((transfer) => ({
      id: transfer.id,
      fromBox: transfer.fromBox,
      toBox: transfer.toBox,
      amount: transfer.amount.toFixed(3),
      transferDate: transfer.transferDate.toISOString().slice(0, 10),
      month: transfer.month,
      year: transfer.year,
      reason: transfer.reason,
      authorizedBy: transfer.authorizedBy,
      isConfirmed: transfer.isConfirmed,
      createdAt: transfer.createdAt.toISOString()
    }));
  });
}

export async function createTransfer(payload: unknown, actorId?: string | null) {
  const parsed = transferSchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات التحويل غير صالحة.", 400);
  }

  if (parsed.data.fromBox === parsed.data.toBox) {
    throw createServiceError("لا يمكن التحويل إلى نفس القاصة.", 400);
  }

  const transferDate = new Date(`${parsed.data.transferDate}T00:00:00.000Z`);
  const month = transferDate.getUTCMonth() + 1;
  const year = transferDate.getUTCFullYear();

  const result = await prisma.$transaction(async (tx) => {
    const transfer = await tx.boxTransfer.create({
      data: {
        fromBox: parsed.data.fromBox,
        toBox: parsed.data.toBox,
        amount: String(parsed.data.amount),
        transferDate,
        month,
        year,
        reason: parsed.data.reason ?? null,
        authorizedBy: actorId ?? null,
        isConfirmed: false
      }
    });

    await createAuditLog(tx, {
      entityType: "box_transfer",
      entityId: transfer.id,
      action: "create",
      actorId: actorId ?? null,
      afterData: transfer
    });

    return {
      id: transfer.id,
      fromBox: transfer.fromBox,
      toBox: transfer.toBox,
      amount: transfer.amount.toFixed(3),
      transferDate: transfer.transferDate.toISOString().slice(0, 10),
      month: transfer.month,
      year: transfer.year,
      reason: transfer.reason,
      authorizedBy: transfer.authorizedBy,
      isConfirmed: transfer.isConfirmed,
      createdAt: transfer.createdAt.toISOString()
    };
  });

  await invalidateFinancialPeriodCaches([{ month, year }]);

  return result;
}

export async function confirmTransfer(id: string, actorId?: string | null) {
  const existing = await prisma.boxTransfer.findUnique({
    where: { id }
  });

  if (!existing) {
    throw createServiceError("التحويل غير موجود.", 404);
  }

  if (existing.isConfirmed) {
    return {
      id: existing.id,
      isConfirmed: true
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.boxTransfer.update({
      where: { id },
      data: {
        isConfirmed: true,
        authorizedBy: actorId ?? existing.authorizedBy
      }
    });

    await recalculateBoxBalancesForPeriod(tx, {
      month: updated.month,
      year: updated.year,
      actorUserId: actorId ?? null,
      note: "إعادة حساب بعد تأكيد تحويل بين القاصات"
    });

    await createAuditLog(tx, {
      entityType: "box_transfer",
      entityId: id,
      action: "update",
      actorId: actorId ?? null,
      beforeData: existing,
      afterData: updated
    });

    return {
      id: updated.id,
      isConfirmed: updated.isConfirmed
    };
  });

  await invalidateFinancialPeriodCaches([{ month: existing.month, year: existing.year }]);

  return result;
}

function createServiceError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
