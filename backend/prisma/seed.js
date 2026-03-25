import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@haebar.local";
  const hash = await bcrypt.hash("Admin12345!", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Admin",
      role: "admin",
      isActive: true,
      passwordHash: hash
    },
    create: {
      name: "System Admin",
      email: adminEmail,
      role: "admin",
      isActive: true,
      passwordHash: hash
    }
  });

  const categories = [
    { name: "تسديد شركات", isCompanySettlement: true, displayOrder: 1 },
    { name: "صرف داخلي", isCompanySettlement: false, displayOrder: 2 },
    { name: "رواتب", isCompanySettlement: false, displayOrder: 3 },
    { name: "نثريات", isCompanySettlement: false, displayOrder: 4 }
  ];

  for (const c of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: c.name },
      update: {
        isActive: true,
        isCompanySettlement: c.isCompanySettlement,
        displayOrder: c.displayOrder
      },
      create: {
        name: c.name,
        isActive: true,
        isCompanySettlement: c.isCompanySettlement,
        displayOrder: c.displayOrder
      }
    });
  }

  const month = 3;
  const year = 2026;
  const daysInMonth = new Date(year, month, 0).getDate();

  const existingMonth = await prisma.monthlySetting.findFirst({ where: { month, year } });
  if (existingMonth) {
    await prisma.monthlySetting.update({
      where: { id: existingMonth.id },
      data: {
        isActive: true,
        daysInMonth
      }
    });
  } else {
    await prisma.monthlySetting.create({
      data: {
        month,
        year,
        daysInMonth,
        isActive: true,
        createdBy: admin.id
      }
    });
  }

  console.log("Seed finished");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

