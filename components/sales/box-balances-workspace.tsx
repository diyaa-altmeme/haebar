"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BoxBalance = {
  id: string;
  boxType: string;
  openingBalance: string;
  incomeSystem: string;
  incomeActual: string;
  totalExpenses: string;
  transfersIn: string;
  transfersOut: string;
  calculatedBalance: string;
  actualBalance: string | null;
  difference: string | null;
  updatedAt: string;
};

export function BoxBalancesWorkspace() {
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const deferredMonth = useDeferredValue(month);
  const deferredYear = useDeferredValue(year);
  const [balances, setBalances] = useState<BoxBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    type: "opening" | "actual";
    boxType: BoxBalance["boxType"];
    value: string;
  } | null>(null);

  const loadBalances = async (selectedMonth: string, selectedYear: string) => {
    setLoading(true);
    const response = await fetch(`/api/boxes?month=${selectedMonth}&year=${selectedYear}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: BoxBalance[]; error?: string };

    if (!response.ok || !payload.data) {
      setLoading(false);
      throw new Error(payload.error ?? "تعذر تحميل القاصات.");
    }

    setBalances(payload.data);
    setLoading(false);
  };

  useEffect(() => {
    startTransition(() => {
      void loadBalances(deferredMonth, deferredYear).catch((issue: Error) => setError(issue.message));
    });
  }, [deferredMonth, deferredYear]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/boxes/recalculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        month: Number(deferredMonth),
        year: Number(deferredYear),
        note: "إعادة حساب يدوية من شاشة القاصات"
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setRecalculating(false);
      setError(payload.error ?? "تعذر تنفيذ إعادة الحساب.");
      return;
    }

    setMessage("تمت إعادة الحساب بنجاح وتسجيلها في Audit Log.");
    await loadBalances(deferredMonth, deferredYear);
    setRecalculating(false);
  };

  const saveBalance = async () => {
    if (!editing) return;

    const response = await fetch(`/api/boxes/${editing.boxType}/${editing.type}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        month: Number(deferredMonth),
        year: Number(deferredYear),
        [editing.type === "opening" ? "openingBalance" : "actualBalance"]: editing.value
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "تعذر تحديث الرصيد.");
      return;
    }

    setEditing(null);
    setMessage("تم تحديث الرصيد وإعادة حساب الفروقات.");
    await loadBalances(deferredMonth, deferredYear);
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="border-b border-slate/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>القاصات والأرصدة</CardTitle>
              <CardDescription>هذا الجدول يعرض ناتج إعادة الحساب بعد جمع المبيعات والمصروفات والتحويلات المؤكدة.</CardDescription>
            </div>
            <Badge variant="success">Recalculation Enabled</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[180px_180px_auto]">
            <div>
              <label className="field-label">الشهر</label>
              <Input value={month} onChange={(event) => setMonth(event.target.value)} />
            </div>
            <div>
              <label className="field-label">السنة</label>
              <Input value={year} onChange={(event) => setYear(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void handleRecalculate()} disabled={recalculating}>
                {recalculating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="ml-2 h-4 w-4" />}
                إعادة حساب القاصات
              </Button>
            </div>
          </div>

          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>القاصة</th>
                  <th>افتتاحي</th>
                  <th>دخل نظامي</th>
                  <th>دخل فعلي</th>
                  <th>مصروفات</th>
                  <th>داخل</th>
                  <th>خارج</th>
                  <th>الرصيد المحتسب</th>
                  <th>الفعلي</th>
                  <th>الفرق</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate">
                      <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                      جار تحميل الأرصدة...
                    </td>
                  </tr>
                ) : balances.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate">
                      لا توجد أرصدة لهذا الشهر حتى الآن.
                    </td>
                  </tr>
                ) : (
                  balances.map((balance) => (
                    <tr key={balance.id}>
                      <td>{balance.boxType}</td>
                      <td className="font-mono">{balance.openingBalance}</td>
                      <td className="font-mono">{balance.incomeSystem}</td>
                      <td className="font-mono">{balance.incomeActual}</td>
                      <td className="font-mono">{balance.totalExpenses}</td>
                      <td className="font-mono">{balance.transfersIn}</td>
                      <td className="font-mono">{balance.transfersOut}</td>
                      <td className="font-mono">{balance.calculatedBalance}</td>
                      <td className="font-mono">{balance.actualBalance ?? "-"}</td>
                      <td className="font-mono">{balance.difference ?? "-"}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing({ type: "opening", boxType: balance.boxType, value: balance.openingBalance })}>
                            افتتاحي
                          </Button>
                          <Button size="sm" onClick={() => setEditing({ type: "actual", boxType: balance.boxType, value: balance.actualBalance ?? balance.calculatedBalance })}>
                            فعلي
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

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing.type === "opening" ? "تعديل الرصيد الافتتاحي" : "تعديل الرصيد الفعلي"}</CardTitle>
            <CardDescription>{editing.boxType}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label className="field-label">القيمة</label>
              <Input value={editing.value} onChange={(event) => setEditing((current) => (current ? { ...current, value: event.target.value } : current))} />
            </div>
            <Button onClick={() => void saveBalance()}>حفظ</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
