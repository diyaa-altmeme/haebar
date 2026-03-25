import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const shiftSchema = z.enum(["morning", "evening", "night"]);
const employeeTypeSchema = z.enum(["cashier", "accounting", "treasury", "manager"]);
const statusSchema = z.enum(["active", "leave", "suspended"]);

const employeeSchema = z.object({
  name: z.string().min(2).max(100),
  cashierNumber: z.number().int().min(1).max(4),
  shift: shiftSchema,
  employeeType: employeeTypeSchema,
  phone: z.string().max(20).optional().nullable(),
  salary: z.number().nonnegative().optional(),
  status: statusSchema
});

export async function listEmployees() {
  return prisma.employee.findMany({
    orderBy: [{ cashierNumber: "asc" }, { name: "asc" }]
  });
}

export async function createEmployee(payload) {
  const parsed = employeeSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }
  const p = parsed.data;

  return prisma.employee.create({
    data: {
      name: p.name,
      cashierNumber: p.cashierNumber,
      shift: p.shift,
      employeeType: p.employeeType,
      phone: p.phone ?? null,
      salary: p.salary ?? 0,
      status: p.status
    }
  });
}

export async function updateEmployee(id, payload) {
  const parsed = employeeSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }
  const p = parsed.data;
  return prisma.employee.update({
    where: { id },
    data: {
      name: p.name,
      cashierNumber: p.cashierNumber,
      shift: p.shift,
      employeeType: p.employeeType,
      phone: p.phone ?? null,
      salary: p.salary ?? 0,
      status: p.status
    }
  });
}

export async function employeeSales({ id, month, year }) {
  return prisma.sale.findMany({
    where: {
      employeeId: id,
      month,
      year
    },
    orderBy: [{ saleDate: "asc" }, { shift: "asc" }]
  });
}

