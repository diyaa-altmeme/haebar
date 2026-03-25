-- هايبر ماركت العائلة السعيدة - مخطط قاعدة البيانات (PostgreSQL)
-- يرجى نسخ هذا الكود ولصقه في محرر SQL الخاص بـ Supabase (SQL Editor) وتشغيله.

-- 1. جدول Users (المستخدمون)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'manager', 'data_entry')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول Employees (الموظفون)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    cashier_number INTEGER CHECK (cashier_number BETWEEN 1 AND 4) NOT NULL,
    shift VARCHAR(50) CHECK (shift IN ('morning', 'evening', 'night')) NOT NULL,
    employee_type VARCHAR(50) CHECK (employee_type IN ('cashier', 'accounting', 'treasury', 'manager')) NOT NULL,
    phone VARCHAR(20),
    salary DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) CHECK (status IN ('active', 'leave', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول Sales (المبيعات)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_date DATE NOT NULL,
    day_number INTEGER CHECK (day_number BETWEEN 1 AND 31) NOT NULL,
    month INTEGER CHECK (month BETWEEN 1 AND 12) NOT NULL,
    year INTEGER NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE RESTRICT NOT NULL,
    cashier_number INTEGER CHECK (cashier_number BETWEEN 1 AND 4) NOT NULL,
    shift VARCHAR(50) CHECK (shift IN ('morning', 'evening', 'night')) NOT NULL,
    
    -- نظام
    cash_system DECIMAL(15,2) DEFAULT 0,
    returns DECIMAL(15,2) DEFAULT 0,
    net_cash_system DECIMAL(15,2) GENERATED ALWAYS AS (cash_system - returns) STORED,
    
    master_system DECIMAL(15,2) DEFAULT 0,
    swish_system DECIMAL(15,2) DEFAULT 0,
    sagi_system DECIMAL(15,2) DEFAULT 0,
    other_elec_system DECIMAL(15,2) DEFAULT 0,
    total_elec_system DECIMAL(15,2) GENERATED ALWAYS AS (master_system + swish_system + sagi_system + other_elec_system) STORED,
    total_net_system DECIMAL(15,2) GENERATED ALWAYS AS ((cash_system - returns) + (master_system + swish_system + sagi_system + other_elec_system)) STORED,
    
    -- فعلي
    cash_actual DECIMAL(15,2) DEFAULT 0,
    master_actual DECIMAL(15,2) DEFAULT 0,
    swish_actual DECIMAL(15,2) DEFAULT 0,
    sagi_actual DECIMAL(15,2) DEFAULT 0,
    other_elec_actual DECIMAL(15,2) DEFAULT 0,
    total_elec_actual DECIMAL(15,2) GENERATED ALWAYS AS (master_actual + swish_actual + sagi_actual + other_elec_actual) STORED,
    total_actual DECIMAL(15,2) GENERATED ALWAYS AS (cash_actual + (master_actual + swish_actual + sagi_actual + other_elec_actual)) STORED,
    
    -- فوارق
    diff_cash DECIMAL(15,2) GENERATED ALWAYS AS (cash_actual - (cash_system - returns)) STORED,
    diff_elec DECIMAL(15,2) GENERATED ALWAYS AS ((master_actual + swish_actual + sagi_actual + other_elec_actual) - (master_system + swish_system + sagi_system + other_elec_system)) STORED,
    diff_total DECIMAL(15,2) GENERATED ALWAYS AS ((cash_actual + (master_actual + swish_actual + sagi_actual + other_elec_actual)) - ((cash_system - returns) + (master_system + swish_system + sagi_system + other_elec_system))) STORED,
    
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sale_date, cashier_number, shift)
);

-- 4. جدول CashBreakdown (تفاصيل عدّ النقود)
CREATE TABLE IF NOT EXISTS cash_breakdown (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    denomination INTEGER CHECK (denomination IN (250, 500, 1000, 5000, 10000, 25000, 50000, 100000)) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS (denomination * count) STORED
);

-- 5. جدول ExpenseCategories (أنواع المصروفات)
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    is_company_settlement BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0
);

-- 6. جدول Expenses (المصروفات)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL,
    day_number INTEGER CHECK (day_number BETWEEN 1 AND 31) NOT NULL,
    month INTEGER CHECK (month BETWEEN 1 AND 12) NOT NULL,
    year INTEGER NOT NULL,
    category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT NOT NULL,
    sub_category VARCHAR(100),
    description TEXT,
    amount DECIMAL(15,2) CHECK (amount > 0) NOT NULL,
    payment_source VARCHAR(50) CHECK (payment_source IN ('cash', 'master', 'swish', 'sagi', 'other_elec', 'bank')) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'check', 'transfer', 'card')) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('paid', 'pending', 'late')) DEFAULT 'paid',
    notes TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. جدول BoxBalances (أرصدة القاصات)
CREATE TABLE IF NOT EXISTS box_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    box_type VARCHAR(50) CHECK (box_type IN ('cash', 'master', 'swish', 'sagi', 'other_elec', 'bank')) NOT NULL,
    month INTEGER CHECK (month BETWEEN 1 AND 12) NOT NULL,
    year INTEGER NOT NULL,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    actual_balance DECIMAL(15,2),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(box_type, month, year)
);

-- 8. جدول BoxTransfers (التحويلات بين القاصات)
CREATE TABLE IF NOT EXISTS box_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_box VARCHAR(50) CHECK (from_box IN ('cash', 'master', 'swish', 'sagi', 'other_elec', 'bank')) NOT NULL,
    to_box VARCHAR(50) CHECK (to_box IN ('cash', 'master', 'swish', 'sagi', 'other_elec', 'bank')) NOT NULL,
    amount DECIMAL(15,2) CHECK (amount > 0) NOT NULL,
    transfer_date DATE NOT NULL,
    month INTEGER CHECK (month BETWEEN 1 AND 12) NOT NULL,
    year INTEGER NOT NULL,
    reason TEXT,
    authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (from_box != to_box)
);

-- 9. جدول MonthlySettings (إعدادات الشهر)
CREATE TABLE IF NOT EXISTS monthly_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INTEGER CHECK (month BETWEEN 1 AND 12) NOT NULL,
    year INTEGER NOT NULL,
    days_in_month INTEGER CHECK (days_in_month BETWEEN 28 AND 31) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(month, year)
);

-- إعداد RLS (Row Level Security) - اختياري لكن مفضل في Supabase
-- يمكنك تفعيل الـ RLS لاحقاً وتحديد من يمكنه قراءة وكتابة البيانات بناءً على الـ Auth.
