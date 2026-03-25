const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create Boxes
  const boxes = [
    { type: 'cash', name: 'قاصة الكاش', balance: 0, actual: 0, diff: 0 },
    { type: 'master', name: 'ماستر كارد', balance: 0, actual: 0, diff: 0 },
    { type: 'swish', name: 'سويج', balance: 0, actual: 0, diff: 0 },
    { type: 'sagi', name: 'الساقي', balance: 0, actual: 0, diff: 0 },
    { type: 'other_elec', name: 'فيزا أخرى', balance: 0, actual: 0, diff: 0 },
    { type: 'bank', name: 'رصيد البنك', balance: 0, actual: 0, diff: 0 },
  ];

  for (const box of boxes) {
    await prisma.box.upsert({
      where: { type: box.type },
      update: {},
      create: box,
    });
  }

  // Create Expense Categories
  const categories = ['ضيافة', 'صيانة', 'مشتريات بضاعة', 'رواتب', 'نثريات'];
  for (const cat of categories) {
    const existing = await prisma.expenseCategory.findFirst({ where: { name: cat } });
    if (!existing) {
      await prisma.expenseCategory.create({ data: { name: cat } });
    }
  }

  // Create some employees
  const employees = [
    { name: 'أحمد محمد', cashier_number: 1, shift: 'morning', employee_type: 'cashier' },
    { name: 'سارة علي', cashier_number: 2, shift: 'evening', employee_type: 'cashier' },
    { name: 'محمود سعد', cashier_number: null, shift: 'morning', employee_type: 'manager' },
  ];

  for (const emp of employees) {
    const existing = await prisma.employee.findFirst({ where: { name: emp.name } });
    if (!existing) {
      await prisma.employee.create({ data: emp });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
