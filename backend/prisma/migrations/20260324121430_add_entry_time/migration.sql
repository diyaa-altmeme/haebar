-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "entry_time" TEXT;

-- CreateIndex
CREATE INDEX "box_transfers_month_year_idx" ON "box_transfers"("month", "year");

-- CreateIndex
CREATE INDEX "box_transfers_transfer_date_idx" ON "box_transfers"("transfer_date");

-- CreateIndex
CREATE INDEX "expenses_month_year_idx" ON "expenses"("month", "year");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "sales_month_year_idx" ON "sales"("month", "year");

-- CreateIndex
CREATE INDEX "sales_sale_date_idx" ON "sales"("sale_date");

-- CreateIndex
CREATE INDEX "sales_employee_id_idx" ON "sales"("employee_id");
