"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Edit3,
  Loader2,
  MonitorSmartphone,
  Plus,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { denominationOptions } from "@/lib/calculations/sales";

type Employee = {
  id: string;
  name: string;
  cashierNumber: number;
  shift: "morning" | "evening" | "night";
};

type Sale = {
  id: string;
  saleDate: string;
  employeeId: string;
  employeeName: string | null;
  cashierNumber: number;
  shift: string;
  entryTime: string | null;
  cashSystem: string;
  returns: string;
  totalNetSystem: string;
  cashActual: string;
  totalActual: string;
  diffTotal: string;
  notes: string | null;
  masterSystem: string;
  swishSystem: string;
  sagiSystem: string;
  otherElecSystem: string;
  masterActual: string;
  swishActual: string;
  sagiActual: string;
  otherElecActual: string;
  cashBreakdown: Array<{
    denomination: number;
    count: number;
  }>;
};

type SaleFormState = {
  id?: string;
  employeeId: string;
  cashierNumber: string;
  shift: "morning" | "evening" | "night";
  saleDate: string;
  entryTime: string;
  cashSystem: string;
  returns: string;
  cashActual: string;
  systemElectronic: Record<"master" | "swish" | "sagi" | "otherElec", string>;
  actualElectronic: Record<"master" | "swish" | "sagi" | "otherElec", string>;
  cashBreakdown: Array<{
    denomination: number;
    count: string;
  }>;
  notes: string;
};

const shiftLabels = {
  morning: "صباحي",
  evening: "مسائي",
  night: "ليلي"
} as const;

function createEmptyForm(): SaleFormState {
  const now = new Date();

  return {
    employeeId: "",
    cashierNumber: "",
    shift: "morning",
    saleDate: now.toISOString().slice(0, 10),
    entryTime: now.toTimeString().slice(0, 5),
    cashSystem: "0.000",
    returns: "0.000",
    cashActual: "0.000",
    systemElectronic: {
      master: "0.000",
      swish: "0.000",
      sagi: "0.000",
      otherElec: "0.000"
    },
    actualElectronic: {
      master: "0.000",
      swish: "0.000",
      sagi: "0.000",
      otherElec: "0.000"
    },
    cashBreakdown: denominationOptions.map((denomination) => ({
      denomination,
      count: "0"
    })),
    notes: ""
  };
}

export function SalesWorkspace() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const deferredMonth = useDeferredValue(month);
  const deferredYear = useDeferredValue(year);
  const [form, setForm] = useState<SaleFormState>(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadEmployees = async () => {
    const response = await fetch("/api/employees", { cache: "no-store" });
    const payload = (await response.json()) as { data?: Employee[]; error?: string };

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "تعذر تحميل الموظفين.");
    }

    setEmployees(payload.data);
  };

  const loadSales = async (selectedMonth: string, selectedYear: string) => {
    setLoading(true);
    const response = await fetch(`/api/sales?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: Sale[]; error?: string };

    if (!response.ok || !payload.data) {
      setLoading(false);
      throw new Error(payload.error ?? "تعذر تحميل المبيعات.");
    }

    setSales(payload.data);
    setLoading(false);
  };

  useEffect(() => {
    startTransition(() => {
      void loadEmployees().catch((issue: Error) => setError(issue.message));
    });
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadSales(deferredMonth, deferredYear).catch((issue: Error) => setError(issue.message));
    });
  }, [deferredMonth, deferredYear]);

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((item) => item.id === employeeId);
    setForm((current) => ({
      ...current,
      employeeId,
      cashierNumber: employee ? String(employee.cashierNumber) : "",
      shift: employee?.shift ?? current.shift
    }));
  };

  const openCreateDialog = () => {
    resetForm(false);
    setDialogOpen(true);
  };

  const handleEdit = async (saleId: string) => {
    setError(null);
    const response = await fetch(`/api/sales/${saleId}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: Sale; error?: string };

    if (!response.ok || !payload.data) {
      setError(payload.error ?? "تعذر تحميل القيد.");
      return;
    }

    const sale = payload.data;
    const breakdownMap = new Map(sale.cashBreakdown.map((row) => [row.denomination, row.count]));

    setForm({
      id: sale.id,
      employeeId: sale.employeeId,
      cashierNumber: String(sale.cashierNumber),
      shift: sale.shift as SaleFormState["shift"],
      saleDate: sale.saleDate,
      entryTime: sale.entryTime ?? "08:00",
      cashSystem: sale.cashSystem,
      returns: sale.returns,
      cashActual: sale.cashActual,
      systemElectronic: {
        master: sale.masterSystem,
        swish: sale.swishSystem,
        sagi: sale.sagiSystem,
        otherElec: sale.otherElecSystem
      },
      actualElectronic: {
        master: sale.masterActual,
        swish: sale.swishActual,
        sagi: sale.sagiActual,
        otherElec: sale.otherElecActual
      },
      cashBreakdown: denominationOptions.map((denomination) => ({
        denomination,
        count: String(breakdownMap.get(denomination) ?? 0)
      })),
      notes: sale.notes ?? ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (saleId: string) => {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/sales/${saleId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "تعذر حذف القيد.");
      return;
    }

    setSuccess("تم حذف القيد وإعادة حساب القاصات بنجاح.");
    await loadSales(deferredMonth, deferredYear);
  };

  const resetForm = (closeDialog = true) => {
    setForm(createEmptyForm());
    if (closeDialog) {
      setDialogOpen(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      employeeId: form.employeeId,
      cashierNumber: Number(form.cashierNumber),
      shift: form.shift,
      saleDate: form.saleDate,
      entryTime: form.entryTime,
      cashSystem: form.cashSystem,
      returns: form.returns,
      cashActual: form.cashActual,
      systemElectronic: form.systemElectronic,
      actualElectronic: form.actualElectronic,
      cashBreakdown: form.cashBreakdown.map((row) => ({
        denomination: row.denomination,
        count: Number(row.count || "0")
      })),
      notes: form.notes || null
    };

    const response = await fetch(form.id ? `/api/sales/${form.id}` : "/api/sales", {
      method: form.id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSaving(false);
      setError(result.error ?? "فشل حفظ القيد.");
      return;
    }

    setSuccess(form.id ? "تم تحديث القيد المالي من الخادم بنجاح." : "تم إنشاء القيد المالي من الخادم بنجاح.");
    resetForm();
    await loadSales(deferredMonth, deferredYear);
    setSaving(false);
  };

  return (
    <section className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>إدارة المبيعات</CardTitle>
                <CardDescription>جميع الحسابات النهائية تنفذ في الخلفية فقط، بينما الواجهة هنا مسؤولة عن الإدخال والعرض.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Input className="w-20" value={month} onChange={(event) => setMonth(event.target.value)} />
                <Input className="w-28" value={year} onChange={(event) => setYear(event.target.value)} />
                <Badge variant="success">No Frontend Calculations</Badge>
                <Button onClick={openCreateDialog}>
                  <Plus className="ml-2 h-4 w-4" />
                  قيد مبيعات جديد
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الموظف</th>
                    <th>الشفت</th>
                    <th>صافي النظام</th>
                    <th>الإجمالي الفعلي</th>
                    <th>الفارق</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12">
                        <div className="flex items-center justify-center gap-2 text-slate">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جار تحميل القيود
                        </div>
                      </td>
                    </tr>
                  ) : sales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate">
                        لا توجد قيود مبيعات في هذه الفترة.
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="font-mono">{sale.saleDate}</td>
                        <td>
                          <div className="font-medium">{sale.employeeName ?? "غير محدد"}</div>
                          <div className="text-xs text-slate font-mono">كاشير #{sale.cashierNumber}</div>
                        </td>
                        <td>{shiftLabels[sale.shift as keyof typeof shiftLabels] ?? sale.shift}</td>
                        <td className="font-mono">{sale.totalNetSystem}</td>
                        <td className="font-mono">{sale.totalActual}</td>
                        <td className="font-mono">{sale.diffTotal}</td>
                        <td>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => void handleEdit(sale.id)}>
                              <Edit3 className="ml-1 h-3.5 w-3.5" />
                              تعديل
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => void handleDelete(sale.id)}>
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
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? resetForm() : setDialogOpen(true))}>
        <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,234,0.96))] px-0 pb-0 pt-0">
          <DialogHeader>
            <div className="border-b border-slate/10 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl">{form.id ? "تعديل مبيعات شفت" : "إدخال مبيعات شفت جديد"}</DialogTitle>
                  <DialogDescription className="mt-1">
                    التصميم هنا مهيأ للإدخال السريع، بينما الحسابات النهائية والفروقات تنفذ في الخلفية فقط.
                  </DialogDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => resetForm(false)}>
                  <RotateCcw className="ml-1 h-3.5 w-3.5" />
                  إعادة تعيين
                </Button>
              </div>
            </div>
          </DialogHeader>

          <form className="space-y-4 px-4 py-4" onSubmit={handleSubmit}>
            <SectionShell
              icon={<UserRound className="h-4 w-4" />}
              title="بيانات الشفت الأساسية"
              description="حدد الموظف، الشفت، والتاريخ والوقت قبل إدخال الأرقام."
            >
              <div className="grid gap-3 lg:grid-cols-[1.35fr_0.8fr_0.9fr_1fr_0.9fr]">
                <Field label="الموظف (كاشير) *">
                  <select
                    className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm text-ink shadow-sm outline-none transition focus:border-olive/40 focus:ring-2 focus:ring-olive/10"
                    value={form.employeeId}
                    onChange={(event) => handleEmployeeChange(event.target.value)}
                  >
                    <option value="">اختر موظفاً</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} - كاشير {employee.cashierNumber}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="الشفت *">
                  <select
                    className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm text-ink shadow-sm outline-none transition focus:border-olive/40 focus:ring-2 focus:ring-olive/10"
                    value={form.shift}
                    onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value as SaleFormState["shift"] }))}
                  >
                    {Object.entries(shiftLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="رقم الكاشير">
                  <Input value={form.cashierNumber} readOnly className="bg-sky-50/80" />
                </Field>
                <Field label="التاريخ والوقت *">
                  <div className="grid grid-cols-[1fr_120px] gap-2">
                    <Input type="date" value={form.saleDate} onChange={(event) => setForm((current) => ({ ...current, saleDate: event.target.value }))} />
                    <Input type="time" value={form.entryTime} onChange={(event) => setForm((current) => ({ ...current, entryTime: event.target.value }))} />
                  </div>
                </Field>
                <div className="flex items-end">
                  <div className="surface-muted flex w-full items-center gap-2 px-4 py-3 text-sm text-slate">
                    <CalendarDays className="h-4 w-4 text-olive" />
                    <span>{form.saleDate || "—"}</span>
                    <Clock3 className="mr-auto h-4 w-4 text-olive" />
                    <span>{form.entryTime || "—"}</span>
                  </div>
                </div>
              </div>
            </SectionShell>

            <SectionShell
              icon={<Wallet className="h-4 w-4" />}
              title="الجرد الفعلي في القاصة (كاش + إلكتروني)"
              description="أدخل ما تم جرده فعلياً. الخادم سيعتمد هذه القيم في الحساب النهائي."
            >
              <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MoneyField label="إجمالي الكاش الفعلي (الجرد)" value={form.cashActual} onChange={(value) => setForm((current) => ({ ...current, cashActual: value }))} accent="emerald" />
                    <InfoStrip label="مجموع الجرد الفعلي" value="يُحسب في الخادم عند الحفظ" tone="success" />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="field-label mb-0">مبالغ الفئات النقدية (الجرد)</label>
                      <Badge variant="warning">مرجع أعلى للكاش الفعلي</Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {form.cashBreakdown.map((row, index) => (
                        <div key={row.denomination} className="rounded-2xl border border-slate/10 bg-white px-3 py-2 shadow-sm">
                          <div className="mb-1 flex items-center justify-between">
                            <div className="text-xs font-semibold text-ink">{row.denomination.toLocaleString("en-US")}</div>
                            <div className="text-xs text-slate">IQD</div>
                          </div>
                          <Input
                            className="h-9 px-3 text-xs"
                            inputMode="numeric"
                            value={row.count}
                            onChange={(event) =>
                              setForm((current) => {
                                const next = [...current.cashBreakdown];
                                next[index] = { ...next[index], count: event.target.value };
                                return { ...current, cashBreakdown: next };
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <ElectronicBlock
                  title="مبالغ الفيزا الفعلية (الجرد)"
                  subtitle="أدخل تفاصيل المبالغ الفعلية لكل قناة إلكترونية."
                  values={form.actualElectronic}
                  onChange={(key, value) =>
                    setForm((current) => ({
                      ...current,
                      actualElectronic: { ...current.actualElectronic, [key]: value }
                    }))
                  }
                />
              </div>
            </SectionShell>

            <SectionShell
              icon={<MonitorSmartphone className="h-4 w-4" />}
              title="مبيعات النظام (كاش + إلكتروني)"
              description="هذه هي أرقام النظام التي ستتم مقارنتها مع الجرد الفعلي."
            >
              <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MoneyField label="كاش المبيعات (نظام)" value={form.cashSystem} onChange={(value) => setForm((current) => ({ ...current, cashSystem: value }))} accent="amber" />
                    <MoneyField label="المرتجعات (نظام)" value={form.returns} onChange={(value) => setForm((current) => ({ ...current, returns: value }))} accent="amber" />
                  </div>
                  <InfoStrip label="إجمالي المطلوب من النظام (صافي)" value="يُحسب في الخادم عند الحفظ" tone="neutral" />
                </div>

                <ElectronicBlock
                  title="تفاصيل الفيزا (نظام)"
                  subtitle="تفصيل القيم المسجلة في النظام قبل المقارنة."
                  values={form.systemElectronic}
                  onChange={(key, value) =>
                    setForm((current) => ({
                      ...current,
                      systemElectronic: { ...current.systemElectronic, [key]: value }
                    }))
                  }
                />
              </div>
            </SectionShell>

            <SectionShell
              icon={<ShieldCheck className="h-4 w-4" />}
              title="الخلاصة والفروقات النهائية"
              description="الفروقات لا يتم حسابها هنا في الواجهة. تظهر من الخادم بعد الحفظ والمطابقة."
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <SummaryTile title="فارق الكاش" value="قيد الحساب" caption="يحسب في الخلفية" />
                <SummaryTile title="فارق الإلكتروني" value="قيد الحساب" caption="يحسب في الخلفية" />
                <SummaryTile title="الفارق الإجمالي" value="قيد الحساب" caption="بعد المقارنة النهائية" />
              </div>
            </SectionShell>

            <SectionShell
              icon={<ReceiptText className="h-4 w-4" />}
              title="ملاحظات"
              description="أي توضيح إضافي مرتبط بهذا الشفت أو بعملية الجرد."
            >
              <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </SectionShell>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs leading-6 text-emerald-900">
              الحفظ ينفذ Transaction مالية كاملة ثم يعيد حساب القاصات ويسجل العملية في Audit Log.
            </div>

            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <DialogFooter className="sticky bottom-0 border-t border-slate/10 bg-white/95 px-4 py-3 backdrop-blur">
              <Button className="min-w-[190px] bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={saving}>
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
                {form.id ? "حفظ وترحيل التعديل" : "حفظ وترحيل المبالغ"}
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

function MoneyField({
  label,
  value,
  onChange,
  accent = "neutral"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accent?: "neutral" | "emerald" | "amber";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50/40"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/40"
        : "";

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate">{label}</label>
      <Input className={`${accentClass} h-10 px-3 text-xs`} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ElectronicBlock({
  title,
  subtitle,
  values,
  onChange
}: {
  title: string;
  subtitle?: string;
  values: Record<"master" | "swish" | "sagi" | "otherElec", string>;
  onChange: (key: "master" | "swish" | "sagi" | "otherElec", value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate/10 bg-white/80 p-3 shadow-sm">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11px] text-slate">{subtitle}</p> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {([
          ["master", "Master"],
          ["swish", "Swish"],
          ["sagi", "Sagi"],
          ["otherElec", "Other"]
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-slate">{label}</label>
            <Input className="h-10 px-3 text-xs" inputMode="decimal" value={values[key]} onChange={(event) => onChange(key, event.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate">{label}</label>
      {children}
    </div>
  );
}

function SectionShell({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate/10 bg-white/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-xs text-slate">{description}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700">{icon}</div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoStrip({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "neutral" | "success";
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
          : "rounded-xl border border-slate/10 bg-slate-50 px-3 py-2"
      }
    >
      <div className="text-xs font-medium text-slate">{label}</div>
      <div className="mt-1 text-xs font-semibold text-ink">{value}</div>
    </div>
  );
}

function SummaryTile({
  title,
  value,
  caption
}: {
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fbff,#edf5ff)] px-3 py-4 text-center shadow-sm">
      <div className="text-xs font-semibold text-ink">{title}</div>
      <div className="mt-2 text-lg font-bold text-sky-700">{value}</div>
      <div className="mt-2 inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">مطابقة بعد الحفظ</div>
      <div className="mt-1 text-[11px] text-slate">{caption}</div>
    </div>
  );
}
