import { existsSync, readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL && existsSync(".env")) {
  const envFile = readFileSync(".env", "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^"(.*)"$/, "$1");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const prisma = new PrismaClient();

async function upsertEmployee(input: {
  name: string;
  cashierNumber: number;
  shift: "morning" | "evening" | "night";
}) {
  const existing = await prisma.employee.findFirst({
    where: {
      cashierNumber: input.cashierNumber,
      shift: input.shift
    }
  });

  if (existing) {
    return prisma.employee.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        employeeType: "cashier",
        status: "active",
        salary: "0.000"
      }
    });
  }

  return prisma.employee.create({
    data: {
      name: input.name,
      cashierNumber: input.cashierNumber,
      shift: input.shift,
      employeeType: "cashier",
      status: "active",
      salary: "0.000"
    }
  });
}

async function main() {
  const adminEmail = "admin@haebar.local";
  const passwordHash = await bcrypt.hash("Admin12345!", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "مدير النظام",
      role: "admin",
      isActive: true,
      passwordHash
    },
    create: {
      name: "مدير النظام",
      email: adminEmail,
      role: "admin",
      isActive: true,
      passwordHash
    }
  });

  await upsertEmployee({ name: "أحمد فاضل", cashierNumber: 1, shift: "morning" });
  await upsertEmployee({ name: "سارة قاسم", cashierNumber: 2, shift: "evening" });
  await upsertEmployee({ name: "علي صباح", cashierNumber: 3, shift: "night" });

  const categories = [
    { name: "تسديد شركات", isCompanySettlement: true, displayOrder: 1 },
    { name: "صرف داخلي", isCompanySettlement: false, displayOrder: 2 },
    { name: "رواتب", isCompanySettlement: false, displayOrder: 3 },
    { name: "نثريات", isCompanySettlement: false, displayOrder: 4 }
  ];

  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: category.name },
      update: {
        isActive: true,
        isCompanySettlement: category.isCompanySettlement,
        displayOrder: category.displayOrder
      },
      create: {
        name: category.name,
        isActive: true,
        isCompanySettlement: category.isCompanySettlement,
        displayOrder: category.displayOrder
      }
    });
  }

  const today = new Date();
  const month = today.getUTCMonth() + 1;
  const year = today.getUTCFullYear();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  await prisma.monthlySetting.upsert({
    where: { month_year: { month, year } },
    update: {
      daysInMonth,
      isActive: true
    },
    create: {
      month,
      year,
      daysInMonth,
      isActive: true,
      createdBy: admin.id
    }
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
