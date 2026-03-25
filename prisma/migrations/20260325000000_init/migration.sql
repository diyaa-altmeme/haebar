-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'data_entry');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('morning', 'evening', 'night');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('cashier', 'accounting', 'treasury', 'manager');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('active', 'leave', 'suspended');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'check', 'transfer', 'card');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('paid', 'pending', 'late');

-- CreateEnum
CREATE TYPE "BoxType" AS ENUM ('cash', 'master', 'swish', 'sagi', 'other_elec', 'bank');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'recalculate');

-- CreateEnum
CREATE TYPE "RecalculationStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "cashier_number" INTEGER NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "employee_type" "EmployeeType" NOT NULL,
    "phone" VARCHAR(20),
    "salary" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "sale_date" DATE NOT NULL,
    "day_number" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "employee_id" UUID NOT NULL,
    "cashier_number" INTEGER NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "cash_system" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "returns" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "net_cash_system" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "master_system" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "swishSystem" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "sagiSystem" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "other_elec_system" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_elec_system" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_net_system" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "cash_actual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "master_actual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "swishActual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "sagiActual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "other_elec_actual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_elec_actual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_actual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "diff_cash" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "diff_elec" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "diff_total" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "entered_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "entry_time" VARCHAR(10),

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_breakdown" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "denomination" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "subtotal" DECIMAL(18,3) NOT NULL DEFAULT 0,

    CONSTRAINT "cash_breakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "expense_date" DATE NOT NULL,
    "day_number" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "sub_category" VARCHAR(100),
    "description" TEXT,
    "amount" DECIMAL(18,3) NOT NULL,
    "payment_source" "BoxType" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "ExpenseStatus" NOT NULL,
    "notes" TEXT,
    "entered_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_balances" (
    "id" UUID NOT NULL,
    "box_type" "BoxType" NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "opening_balance" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "income_system" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "income_actual" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_expenses" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "transfers_in" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "transfers_out" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "calculated_balance" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "actual_balance" DECIMAL(18,3),
    "difference" DECIMAL(18,3) DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "box_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_transfers" (
    "id" UUID NOT NULL,
    "from_box" "BoxType" NOT NULL,
    "to_box" "BoxType" NOT NULL,
    "amount" DECIMAL(18,3) NOT NULL,
    "transfer_date" DATE NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "reason" TEXT,
    "authorized_by" UUID,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_company_settlement" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_settings" (
    "id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "days_in_month" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,

    CONSTRAINT "monthly_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "action" "AuditAction" NOT NULL,
    "actor_id" UUID,
    "before_data" JSONB,
    "after_data" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recalculation_runs" (
    "id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "box_type" "BoxType",
    "status" "RecalculationStatus" NOT NULL,
    "notes" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "summary" JSONB,
    "triggered_by" UUID,

    CONSTRAINT "recalculation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "sales_month_year_idx" ON "sales"("month", "year");

-- CreateIndex
CREATE INDEX "sales_sale_date_idx" ON "sales"("sale_date");

-- CreateIndex
CREATE INDEX "sales_employee_id_idx" ON "sales"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sale_date_cashier_number_shift_key" ON "sales"("sale_date", "cashier_number", "shift");

-- CreateIndex
CREATE INDEX "expenses_month_year_idx" ON "expenses"("month", "year");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE UNIQUE INDEX "box_balances_box_type_month_year_key" ON "box_balances"("box_type", "month", "year");

-- CreateIndex
CREATE INDEX "box_transfers_month_year_idx" ON "box_transfers"("month", "year");

-- CreateIndex
CREATE INDEX "box_transfers_transfer_date_idx" ON "box_transfers"("transfer_date");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_settings_month_year_key" ON "monthly_settings"("month", "year");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "recalculation_runs_month_year_idx" ON "recalculation_runs"("month", "year");

-- CreateIndex
CREATE INDEX "recalculation_runs_started_at_idx" ON "recalculation_runs"("started_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_breakdown" ADD CONSTRAINT "cash_breakdown_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_transfers" ADD CONSTRAINT "box_transfers_authorized_by_fkey" FOREIGN KEY ("authorized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_settings" ADD CONSTRAINT "monthly_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalculation_runs" ADD CONSTRAINT "recalculation_runs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

