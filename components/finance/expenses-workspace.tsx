"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Category = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  expenseDate: string;
  category: string;
  subCategory: string | null;
  description: string | null;
  amount: string;
  paymentSource: "cash" | "master" | "swish" | "sagi" | "other_elec" | "bank";
  paymentMethod: "cash" | "check" | "transfer" | "card";
  status: "paid" | "pending" | "late";
};

const boxLabels = { cash: "كاش", master: "Master", swish: "Swish", sagi: "Sagi", other_elec: "أخرى", bank: "بنك" } as const;
const statusLabels = { paid: "مسدد", pending: "قيد التسديد", late: "متأخر" } as const;
const paymentLabels = { cash: "نقداً", check: "شيك", transfer: "تحويل", card: "بطاقة" } as const;

export function ExpensesWorkspace() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "",
    subCategory: "",
    description: "",
    amount: "0.000",
    paymentSource: "cash",
    paymentMethod: "cash",
    status: "paid",
    notes: ""
  });

  async function loadCategories() {
    const response = await fetch("/api/settings/expense-categories", { cache: "no-store" });
    const payload = (await response.json()) as { data?: Category[] };
    setCategories(payload.data ?? []);
  }

  async function loadExpenses() {
    setLoading(true);
    const response = await fetch(`/api/expenses?month=${month}&year=${year}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: Expense[]; error?: string };
    if (!response.ok || !payload.data) {
      setLoading(false);
      setError(payload.error ?? "تعذر تحميل المصروفات.");
      return;
    }
    setExpenses(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([loadExpenses(), loadCategories()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  function openCreateDialog() {
    resetForm(false);
    setDialogOpen(true);
  }

  function editExpense(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      expenseDate: expense.expenseDate,
      category: expense.category,
      subCategory: expense.subCategory ?? "",
      description: expense.description ?? "",
      amount: expense.amount,
      paymentSource: expense.paymentSource,
      paymentMethod: expense.paymentMethod,
      status: expense.status,
      notes: ""
    });
    setDialogOpen(true);
  }

  function resetForm(closeDialog = true) {
    setEditingId(null);
    setForm({
      expenseDate: new Date().toISOString().slice(0, 10),
      category: "",
      subCategory: "",
      description: "",
      amount: "0.000",
      paymentSource: "cash",
      paymentMethod: "cash",
      status: "paid",
      notes: ""
    });
    if (closeDialog) {
      setDialogOpen(false);
    }
  }

  async function saveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(editingId ? `/api/expenses/${editingId}` : "/api/expenses", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setSaving(false);
      setError(payload.error ?? "تعذر حفظ المصروف.");
      return;
    }
    resetForm();
    await loadExpenses();
    setSaving(false);
  }

  async function removeExpense(id: string) {
    const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "تعذر حذف المصروف.");
      return;
    }
    await loadExpenses();
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>المصروفات</CardTitle>
              <CardDescription>إدارة المصروفات اليومية وربطها مباشرة بإعادة حساب القاصات.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Input className="w-20" value={month} onChange={(event) => setMonth(event.target.value)} />
              <Input className="w-28" value={year} onChange={(event) => setYear(event.target.value)} />
              <Button variant="outline" onClick={() => void loadExpenses()}>
                تحديث
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مصروف
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>التصنيف</th>
                <th>المبلغ</th>
                <th>المصدر</th>
                <th>طريقة الدفع</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate">
                    <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                    جار تحميل المصروفات
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="font-mono">{expense.expenseDate}</td>
                    <td>{expense.category}</td>
                    <td className="font-mono">{expense.amount}</td>
                    <td>{boxLabels[expense.paymentSource]}</td>
                    <td>{paymentLabels[expense.paymentMethod]}</td>
                    <td>{statusLabels[expense.status]}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => editExpense(expense)}>
                          <Pencil className="ml-1 h-3.5 w-3.5" />
                          تعديل
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void removeExpense(expense.id)}>
                          <Trash2 className="ml-1 h-3.5 w-3.5" />
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? resetForm() : setDialogOpen(true))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل مصروف" : "إضافة مصروف"}</DialogTitle>
            <DialogDescription>أي تغيير هنا سينعكس مباشرة على حسابات القاصات من خلال الخلفية.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveExpense}>
            <Field label="التاريخ">
              <Input type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} />
            </Field>
            <Field label="التصنيف">
              <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                <option value="">اختر التصنيف</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="فرعي">
                <Input value={form.subCategory} onChange={(event) => setForm((current) => ({ ...current, subCategory: event.target.value }))} />
              </Field>
              <Field label="المبلغ">
                <Input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="مصدر الدفع">
                <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.paymentSource} onChange={(event) => setForm((current) => ({ ...current, paymentSource: event.target.value as Expense["paymentSource"] }))}>
                  {Object.entries(boxLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="طريقة الدفع">
                <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value as Expense["paymentMethod"] }))}>
                  {Object.entries(paymentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="الحالة">
              <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Expense["status"] }))}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الوصف">
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? "حفظ التعديل" : "إضافة المصروف"}
              </Button>
              <Button type="button" variant="outline" onClick={() => resetForm()}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
