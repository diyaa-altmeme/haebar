import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import * as boxesService from "./boxesService.js";

const boxTypeSchema = z.enum(["cash", "master", "swish", "sagi", "other_elec", "bank"]);

const transferCreateSchema = z.object({
  from_box: boxTypeSchema,
  to_box: boxTypeSchema,
  amount: z.number().positive(),
  transfer_date: z.string().min(1), // YYYY-MM-DD
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  reason: z.string().optional().nullable()
});

function toDateOnlyUTC(dateStr) {
  // Expects YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

export async function createTransfer({ payload, authorizedByUserId }) {
  const parsed = transferCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }

  const input = parsed.data;
  if (input.from_box === input.to_box) {
    const err = new Error("from_box cannot equal to_box");
    err.statusCode = 400;
    throw err;
  }

  const transferDate = toDateOnlyUTC(input.transfer_date);

  return prisma.$transaction(async (tx) => {
    const t = await tx.boxTransfer.create({
      data: {
        fromBox: input.from_box,
        toBox: input.to_box,
        amount: input.amount,
        transferDate,
        month: input.month,
        year: input.year,
        reason: input.reason ?? null,
        authorizedBy: authorizedByUserId ?? null,
        isConfirmed: false
      }
    });
    return t;
  });
}

export async function listTransfers({ month, year }) {
  return prisma.boxTransfer.findMany({
    where: { month, year },
    orderBy: [{ transferDate: "desc" }, { createdAt: "desc" }]
  });
}

export async function confirmTransfer(id, authorizedByUserId) {
  const t = await prisma.boxTransfer.findUnique({ where: { id } });
  if (!t) {
    const err = new Error("Transfer not found");
    err.statusCode = 404;
    throw err;
  }

  if (t.isConfirmed) {
    return t;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.boxTransfer.update({
      where: { id },
      data: {
        isConfirmed: true
      }
    });

    // Apply to balances: from_box -> transfers_out, to_box -> transfers_in
    await boxesService.applyTransferToBoxBalance({
      month: updated.month,
      year: updated.year,
      boxType: updated.toBox,
      deltaTransfersIn: Number(updated.amount),
      deltaTransfersOut: 0,
      tx
    });

    await boxesService.applyTransferToBoxBalance({
      month: updated.month,
      year: updated.year,
      boxType: updated.fromBox,
      deltaTransfersIn: 0,
      deltaTransfersOut: Number(updated.amount),
      tx
    });

    return updated;
  });
}

