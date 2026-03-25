import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('✓ متصل بقاعدة البيانات');

    // 1. إنشاء المستخدم الإداري
    const adminId = randomUUID();
    const passwordHash = await bcrypt.hash('Admin12345!', 10);
    
    const adminEmail = 'admin@haebar.local';
    const adminName = 'مدير النظام';

    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✓ المستخدم الإداري موجود بالفعل');
    } else {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [adminId, adminName, adminEmail, passwordHash, 'admin', true]
      );
      console.log('✓ تم إنشاء المستخدم الإداري');
    }

    // 2. إنشاء الموظفين
    const employees = [
      { name: 'أحمد فاضل', cashierNumber: 1, shift: 'morning' },
      { name: 'سارة قاسم', cashierNumber: 2, shift: 'evening' },
      { name: 'علي صباح', cashierNumber: 3, shift: 'night' }
    ];

    for (const emp of employees) {
      const existing = await client.query(
        'SELECT id FROM employees WHERE cashier_number = $1 AND shift = $2',
        [emp.cashierNumber, emp.shift]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO employees (id, name, cashier_number, shift, employee_type, status, salary, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [randomUUID(), emp.name, emp.cashierNumber, emp.shift, 'cashier', 'active', '0.000']
        );
      }
    }
    console.log('✓ تم إعداد الموظفين');

    // 3. إنشاء فئات المصروفات
    const categories = [
      { name: 'تسديد شركات', isCompanySettlement: true, displayOrder: 1 },
      { name: 'صرف داخلي', isCompanySettlement: false, displayOrder: 2 },
      { name: 'رواتب', isCompanySettlement: false, displayOrder: 3 },
      { name: 'نثريات', isCompanySettlement: false, displayOrder: 4 }
    ];

    for (const cat of categories) {
      const existing = await client.query(
        'SELECT id FROM expense_categories WHERE name = $1',
        [cat.name]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO expense_categories (id, name, is_company_settlement, display_order, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [randomUUID(), cat.name, cat.isCompanySettlement, cat.displayOrder]
        );
      }
    }
    console.log('✓ تم إعداد فئات المصروفات');

    console.log('\n✅ تم ملء قاعدة البيانات بنجاح!');
    console.log('البيانات الافتراضية:');
    console.log(`البريد: ${adminEmail}`);
    console.log(`كلمة المرور: Admin12345!`);
  } catch (error) {
    console.error('❌ خطأ:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
