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
  Wallet,
  ChevronDown
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
import { addMoney, normalizeMoney } from "@/lib/calculations/money";
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
  systemElectronicItems: Array<{ method: "master" | "swish" | "sagi" | "otherElec" | "other"; amount: string }>;
  actualElectronicItems: Array<{ method: "master" | "swish" | "sagi" | "otherElec" | "other"; amount: string }>;
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

const ELECTRONIC_METHODS = [
  { value: "master", label: "Master" },
  { value: "swish", label: "Swish" },
  { value: "sagi", label: "Sagi" },
  { value: "otherElec", label: "Other" }
] as const;

function createElectronicItems(values: Record<"master" | "swish" | "sagi" | "otherElec", string>) {
  const items = ELECTRONIC_METHODS.filter((method) => Number(values[method.value] || "0") !== 0).map((method) => ({
    method: method.value,
    amount: normalizeMoney(values[method.value] || "0")
  }));

  if (items.length === 0) {
    return [{ method: "master", amount: "0.000" }];
  }

  return items;
}

function electronicItemsToRecord(items: Array<{ method: string; amount: string }>) {
  const initial = { master: "0.000", swish: "0.000", sagi: "0.000", otherElec: "0.000" };
  const mutated = { ...initial };

  for (const item of items) {
    const amount = item.amount ? normalizeMoney(item.amount) : "0.000";
    if (item.method === "master" || item.method === "swish" || item.method === "sagi" || item.method === "otherElec") {
      mutated[item.method] = normalizeMoney(addMoney(mutated[item.method], amount));
    } else {
      mutated.otherElec = normalizeMoney(addMoney(mutated.otherElec, amount));
    }
  }

  return mutated;
}

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
    systemElectronicItems: createElectronicItems({ master: "0.000", swish: "0.000", sagi: "0.000", otherElec: "0.000" }),
    actualElectronicItems: createElectronicItems({ master: "0.000", swish: "0.000", sagi: "0.000", otherElec: "0.000" }),
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
  const [denominationsModalOpen, setDenominationsModalOpen] = useState(false);

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
      systemElectronicItems: createElectronicItems({
        master: sale.masterSystem,
        swish: sale.swishSystem,
        sagi: sale.sagiSystem,
        otherElec: sale.otherElecSystem
      }),
      actualElectronicItems: createElectronicItems({
        master: sale.masterActual,
        swish: sale.swishActual,
        sagi: sale.sagiActual,
        otherElec: sale.otherElecActual
      }),
      cashBreakdown: denominationOptions.map((denomination) => ({
        denomination,
        count: String(breakdownMap.get(denomination) ?? 0)
      })),
      notes: sale.notes ?? ""
    });
    setDenominationsModalOpen(false);
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
    setDenominationsModalOpen(false);
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
      systemElectronic: electronicItemsToRecord(form.systemElectronicItems),
      actualElectronic: electronicItemsToRecord(form.actualElectronicItems),
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
            <div className="border-b border-slate/10 px-4 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <DialogTitle className="text-lg">{form.id ? "تعديل مبيعات شفت" : "إدخال مبيعات شفت جديد"}</DialogTitle>
                  <DialogDescription className="mt-0.5 text-[12px]">
                    التصميم مهيأ للإدخال السريع، الحسابات تنفذ في الخلفية.
                  </DialogDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => resetForm(false)}>
                  <RotateCcw className="ml-1 h-3 w-3" />
                  إعادة
                </Button>
              </div>
            </div>
          </DialogHeader>

          <form className="space-y-2 px-3 py-2.5" onSubmit={handleSubmit}>
            <SectionShell
              icon={<UserRound className="h-3 w-3" />}
              title="بيانات الشفت الأساسية"
              description="حدد الموظف، الشفت، والتاريخ والوقت."
            >
              <div className="grid gap-2 lg:grid-cols-[1.35fr_0.8fr_0.9fr_1fr_0.9fr]">
                <Field label="الموظف (كاشير) *">
                  <select
                    className="flex h-9 w-full rounded-xl border border-slate/15 bg-white px-3 text-xs text-ink shadow-sm outline-none transition focus:border-olive/40 focus:ring-1 focus:ring-olive/10"
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
                    className="flex h-9 w-full rounded-xl border border-slate/15 bg-white px-3 text-xs text-ink shadow-sm outline-none transition focus:border-olive/40 focus:ring-1 focus:ring-olive/10"
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
                  <Input value={form.cashierNumber} readOnly className="bg-sky-50/80 h-9 text-xs" />
                </Field>
                <Field label="التاريخ والوقت *">
                  <div className="grid grid-cols-[1fr_100px] gap-1.5">
                    <Input type="date" value={form.saleDate} onChange={(event) => setForm((current) => ({ ...current, saleDate: event.target.value }))} className="h-9 text-xs" />
                    <Input type="time" value={form.entryTime} onChange={(event) => setForm((current) => ({ ...current, entryTime: event.target.value }))} className="h-9 text-xs" />
                  </div>
                </Field>
                <div className="flex items-end">
                  <div className="surface-muted flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate">
                    <CalendarDays className="h-3 w-3 text-olive" />
                    <span>{form.saleDate || "—"}</span>
                    <Clock3 className="mr-auto h-3 w-3 text-olive" />
                    <span>{form.entryTime || "—"}</span>
                  </div>
                </div>
              </div>
            </SectionShell>

            <SectionShell
              icon={<Wallet className="h-3 w-3" />}
              title="الجرد الفعلي في القاصة (كاش + إلكتروني)"
              description="أدخل ما تم جرده فعلياً."
            >
              <div className="grid gap-2 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MoneyField label="الكاش الفعلي" value={form.cashActual} onChange={(value) => setForm((current) => ({ ...current, cashActual: value }))} accent="emerald" />
                    <InfoStrip label="المجموع" value="يُحسب في الخادم" tone="success" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setDenominationsModalOpen(true)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate/10 bg-sky-50/50 px-3 py-2 text-xs font-medium text-slate hover:bg-sky-50 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5 text-sky-600" />
                      تفاصيل الفئات النقدية
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-sky-600" />
                  </button>

                  <Dialog open={denominationsModalOpen} onOpenChange={setDenominationsModalOpen}>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>تفاصيل الفئات النقدية</DialogTitle>
                        <DialogDescription>أدخل عدد القطع لكل فئة، ثم أغلق لتطبيقها.</DialogDescription>
                      </DialogHeader>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {form.cashBreakdown.map((row, index) => (
                          <div key={row.denomination} className="rounded-lg border border-slate/10 bg-white p-2">
                            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-ink">
                              <span>{row.denomination.toLocaleString("en-US")} IQD</span>
                              <span className="text-slate">×</span>
                            </div>
                            <Input
                              className="h-8 px-2 text-xs"
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

                      <DialogFooter>
                        <Button type="button" onClick={() => setDenominationsModalOpen(false)}>
                          إغلاق
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <ElectronicBlock
                  title="الفيزا الفعلية (الجرد)"
                  subtitle="أضف أكثر من إدخال إلكتروني واحد (مستر، سويش، ساجي أو أخرى)."
                  items={form.actualElectronicItems}
                  onChange={(index, field, value) =>
                    setForm((current) => {
                      const next = [...current.actualElectronicItems];
                      next[index] = { ...next[index], [field]: value };
                      return { ...current, actualElectronicItems: next };
                    })
                  }
                  onAdd={() =>
                    setForm((current) => ({
                      ...current,
                      actualElectronicItems: [...current.actualElectronicItems, { method: "otherElec", amount: "0.000" }]
                    }))
                  }
                  onRemove={(index) =>
                    setForm((current) => {
                      const next = current.actualElectronicItems.filter((_, i) => i !== index);
                      return { ...current, actualElectronicItems: next };
                    })
                  }
                />
              </div>
            </SectionShell>

            <SectionShell
              icon={<MonitorSmartphone className="h-3 w-3" />}
              title="مبيعات النظام (كاش + إلكتروني)"
              description="أرقام النظام للمقارنة مع الجرد."
            >
              <div className="grid gap-2 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MoneyField label="الكاش (نظام)" value={form.cashSystem} onChange={(value) => setForm((current) => ({ ...current, cashSystem: value }))} accent="amber" />
                    <MoneyField label="المرتجعات" value={form.returns} onChange={(value) => setForm((current) => ({ ...current, returns: value }))} accent="amber" />
                  </div>
                  <InfoStrip label="الصافي" value="يُحسب في الخادم" tone="neutral" />
                </div>

                <ElectronicBlock
                  title="الفيزا (نظام)"
                  subtitle="أضف أكثر من إدخال إلكتروني واحد من النظام."
                  items={form.systemElectronicItems}
                  onChange={(index, field, value) =>
                    setForm((current) => {
                      const next = [...current.systemElectronicItems];
                      next[index] = { ...next[index], [field]: value };
                      return { ...current, systemElectronicItems: next };
                    })
                  }
                  onAdd={() =>
                    setForm((current) => ({
                      ...current,
                      systemElectronicItems: [...current.systemElectronicItems, { method: "otherElec", amount: "0.000" }]
                    }))
                  }
                  onRemove={(index) =>
                    setForm((current) => {
                      const next = current.systemElectronicItems.filter((_, i) => i !== index);
                      return { ...current, systemElectronicItems: next };
                    })
                  }
                />
              </div>
            </SectionShell>

            <SectionShell
              icon={<ShieldCheck className="h-3 w-3" />}
              title="الخلاصة والفروقات"
              description="تُحسب من الخادم بعد الحفظ."
            >
              <div className="grid gap-2 lg:grid-cols-3">
                <SummaryTile title="فارق الكاش" value="قيد الحساب" caption="يحسب في الخلفية" />
                <SummaryTile title="فارق الإلكتروني" value="قيد الحساب" caption="يحسب في الخلفية" />
                <SummaryTile title="الفارق الإجمالي" value="قيد الحساب" caption="بعد المقارنة النهائية" />
              </div>
            </SectionShell>

            <SectionShell
              icon={<ReceiptText className="h-3 w-3" />}
              title="ملاحظات"
              description="توضيح إضافي مرتبط بالشفت."
            >
              <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-16 text-xs" />
            </SectionShell>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-[11px] leading-5 text-emerald-900">
              الحفظ ينفذ Transaction مالية كاملة ثم يعيد حساب القاصات.
            </div>

            {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}

            <DialogFooter className="sticky bottom-0 border-t border-slate/10 bg-white/95 px-3 py-2 backdrop-blur gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700 h-9 text-sm" type="submit" disabled={saving}>
                {saving ? <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="ml-1.5 h-3.5 w-3.5" />}
                {form.id ? "تحديث" : "حفظ"}
              </Button>
              <Button type="button" variant="outline" onClick={() => resetForm()} className="h-9 text-sm">
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
      <label className="mb-0.5 block text-xs font-medium text-slate">{label}</label>
      <Input className={`${accentClass} h-8 px-2.5 text-xs`} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ElectronicBlock({
  title,
  subtitle,
  items,
  onChange,
  onAdd,
  onRemove
}: {
  title: string;
  subtitle?: string;
  items: Array<{ method: "master" | "swish" | "sagi" | "otherElec" | "other"; amount: string }>;
  onChange: (index: number, field: "method" | "amount", value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate/10 bg-white/80 p-2 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[10px] text-slate">{subtitle}</p> : null}
        </div>
        <Button size="xs" variant="outline" type="button" onClick={onAdd}>
          + إضافة مبلغ
        </Button>
      </div>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={`${item.method}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
            <select
              className="h-8 rounded-lg border border-slate/20 bg-white px-2 text-xs"
              value={item.method}
              onChange={(event) => onChange(index, "method", event.target.value)}
            >
              {ELECTRONIC_METHODS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="other">سوا</option>
            </select>
            <Input
              className="h-8 px-2.5 text-xs"
              inputMode="decimal"
              value={item.amount}
              onChange={(event) => onChange(index, "amount", event.target.value)}
            />
            <Button size="xs" variant="ghost" type="button" onClick={() => onRemove(index)}>
              حذف
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-0.5 block text-xs font-medium text-slate">{label}</label>
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
    <section className="rounded-lg border border-slate/10 bg-white/80 shadow-xs">
      <div className="flex items-start justify-between gap-2 border-b border-slate/10 px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-[11px] text-slate">{description}</p>
        </div>
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">{icon}</div>
      </div>
      <div className="p-2.5">{children}</div>
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
          ? "rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5"
          : "rounded-lg border border-slate/10 bg-slate-50 px-2.5 py-1.5"
      }
    >
      <div className="text-xs font-medium text-slate">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-ink">{value}</div>
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
    <div className="rounded-lg border border-sky-100 bg-[linear-gradient(180deg,#f8fbff,#edf5ff)] px-2.5 py-2.5 text-center shadow-xs">
      <div className="text-xs font-semibold text-ink">{title}</div>
      <div className="mt-1.5 text-base font-bold text-sky-700">{value}</div>
      <div className="mt-1.5 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">بعد الحفظ</div>
      <div className="mt-0.5 text-[10px] text-slate">{caption}</div>
    </div>
  );
}
