"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";

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

type Employee = {
  id: string;
  name: string;
  cashierNumber: number;
  shift: "morning" | "evening" | "night";
  employeeType: "cashier" | "accounting" | "treasury" | "manager";
  status: "active" | "leave" | "suspended";
  phone: string | null;
  salary: string;
};

const shiftLabels = { morning: "صباحي", evening: "مسائي", night: "ليلي" } as const;
const typeLabels = { cashier: "كاشير", accounting: "محاسب", treasury: "صندوق", manager: "مدير" } as const;
const statusLabels = { active: "نشط", leave: "إجازة", suspended: "موقوف" } as const;

export function EmployeesWorkspace() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cashierNumber: "1",
    shift: "morning",
    employeeType: "cashier",
    phone: "",
    salary: "0.000",
    status: "active"
  });

  async function loadEmployees() {
    setLoading(true);
    const response = await fetch("/api/employees", { cache: "no-store" });
    const payload = (await response.json()) as { data?: Employee[]; error?: string };
    if (!response.ok || !payload.data) {
      setLoading(false);
      setError(payload.error ?? "تعذر تحميل الموظفين.");
      return;
    }
    setEmployees(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm(closeDialog = true) {
    setEditingId(null);
    setForm({
      name: "",
      cashierNumber: "1",
      shift: "morning",
      employeeType: "cashier",
      phone: "",
      salary: "0.000",
      status: "active"
    });
    if (closeDialog) {
      setDialogOpen(false);
    }
  }

  function openCreateDialog() {
    resetForm(false);
    setDialogOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      cashierNumber: String(employee.cashierNumber),
      shift: employee.shift,
      employeeType: employee.employeeType,
      phone: employee.phone ?? "",
      salary: employee.salary,
      status: employee.status
    });
    setDialogOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(editingId ? `/api/employees/${editingId}` : "/api/employees", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cashierNumber: Number(form.cashierNumber),
        salary: form.salary
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setSaving(false);
      setError(payload.error ?? "تعذر حفظ الموظف.");
      return;
    }

    setSuccess(editingId ? "تم تحديث الموظف بنجاح." : "تم إنشاء الموظف بنجاح.");
    resetForm();
    await loadEmployees();
    setSaving(false);
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>الموظفون</CardTitle>
              <CardDescription>إدارة الكاشير وباقي أنواع الموظفين من خلال الخلفية الجديدة.</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة موظف
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>النوع</th>
                <th>الكاشير</th>
                <th>الشفت</th>
                <th>الحالة</th>
                <th>الراتب</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate">
                    <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                    جار تحميل الموظفين
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{typeLabels[employee.employeeType]}</td>
                    <td>{employee.cashierNumber}</td>
                    <td>{shiftLabels[employee.shift]}</td>
                    <td>{statusLabels[employee.status]}</td>
                    <td className="font-mono">{employee.salary}</td>
                    <td>
                      <Button size="sm" variant="outline" onClick={() => openEdit(employee)}>
                        <Pencil className="ml-1 h-3.5 w-3.5" />
                        تعديل
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? resetForm() : setDialogOpen(true))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل موظف" : "إضافة موظف"}</DialogTitle>
            <DialogDescription>إنشاء أو تعديل الموظفين بنفس هيكل البيانات المعتمد في Prisma.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="الاسم">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="رقم الكاشير">
                <Input value={form.cashierNumber} onChange={(event) => setForm((current) => ({ ...current, cashierNumber: event.target.value }))} />
              </Field>
              <Field label="الراتب">
                <Input value={form.salary} onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الشفت">
                <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.shift} onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value as Employee["shift"] }))}>
                  {Object.entries(shiftLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="النوع">
                <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.employeeType} onChange={(event) => setForm((current) => ({ ...current, employeeType: event.target.value as Employee["employeeType"] }))}>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الحالة">
                <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Employee["status"] }))}>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الهاتف">
                <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </Field>
            </div>
            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? "حفظ التعديل" : "إضافة الموظف"}
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
