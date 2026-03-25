"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Loader2, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DashboardData = {
  totals: {
    totalNetSystem: string;
    totalActual: string;
    diffTotal: string;
    returns: string;
    companySettlement: string;
    internalSpend: string;
    totalExpenses: string;
    finalNetActual: string;
    cashActual: string;
    elecActual: string;
  };
  kpis: {
    highestDay: { day: number; totalActual: string } | null;
    lowestDay: { day: number; totalActual: string } | null;
    avgDaily: string;
    negativeDiffDays: number;
    margin: string;
  };
  weeklySeries: Array<{
    week: string;
    totalNetSystem: number;
    totalActual: number;
  }>;
  paymentMix: Array<{
    name: string;
    value: number;
  }>;
  boxes: Array<{
    id: string;
    boxType: string;
    calculatedBalance: string;
    difference: string | null;
  }>;
  recentSales: Array<{
    id: string;
    saleDate: string;
    cashierNumber: number;
    shift: string;
    totalActual: string;
    employeeName: string;
  }>;
  recentExpenses: Array<{
    id: string;
    expenseDate: string;
    category: string;
    amount: string;
    status: string;
  }>;
};

const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const boxLabels: Record<string, string> = {
  cash: "الكاش",
  master: "Master",
  swish: "Swish",
  sagi: "Sagi",
  other_elec: "أخرى",
  bank: "البنك"
};

const statusLabels: Record<string, string> = {
  paid: "مسدد",
  pending: "قيد التسديد",
  late: "متأخر"
};

export function DashboardWorkspace() {
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/dashboard?month=${month}&year=${year}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: DashboardData; error?: string };

    if (!response.ok || !payload.data) {
      setLoading(false);
      setError(payload.error ?? "تعذر تحميل لوحة القيادة.");
      return;
    }

    setData(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(160deg,rgba(16,24,40,1),rgba(45,90,70,0.96))] text-white">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white">لوحة القيادة المالية</CardTitle>
              <CardDescription className="text-white/70">
                متابعة شاملة للمبيعات والمصروفات والقاصات من خلال طبقة الخلفية الجديدة فقط.
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <select
                className="h-11 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={String(index + 1)} className="text-ink">
                    {name}
                  </option>
                ))}
              </select>
              <Input className="w-28 border-white/10 bg-white/10 text-white placeholder:text-white/50" value={year} onChange={(event) => setYear(event.target.value)} />
              <button className="rounded-2xl bg-white px-5 text-sm font-medium text-ink" onClick={() => void loadDashboard()}>
                تحديث
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading || !data ? (
        <div className="surface flex min-h-[320px] items-center justify-center text-slate">
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          جار تحميل لوحة القيادة
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <MetricCard title="صافي النظام" value={data.totals.totalNetSystem} icon={<TrendingUp className="h-5 w-5" />} />
            <MetricCard title="الإجمالي الفعلي" value={data.totals.totalActual} icon={<Wallet className="h-5 w-5" />} />
            <MetricCard title="الفارق الكلي" value={data.totals.diffTotal} icon={<TrendingDown className="h-5 w-5" />} />
            <MetricCard title="الصافي النهائي" value={data.totals.finalNetActual} icon={<Wallet className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <Card>
              <CardHeader>
                <CardTitle>المبيعات الأسبوعية</CardTitle>
                <CardDescription>مقارنة بين النظام والفعلي لكل أسبوع.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklySeries}>
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="totalNetSystem" fill="#2d5a46" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="totalActual" fill="#c68b2f" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>توزيع طرق الدفع</CardTitle>
                <CardDescription>مقارنة الكاش مع الدفع الإلكتروني.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.paymentMix} dataKey="value" nameKey="name" outerRadius={90}>
                      {data.paymentMix.map((entry, index) => (
                        <Cell key={entry.name} fill={index === 0 ? "#2d5a46" : "#d96f4a"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>أداء الشهر</CardTitle>
                <CardDescription>ملخص المؤشرات التشغيلية الأساسية.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate">
                <div className="flex items-center justify-between">
                  <span>أفضل يوم مبيعات</span>
                  <span className="font-mono text-ink">{data.kpis.highestDay ? `${data.kpis.highestDay.day} / ${data.kpis.highestDay.totalActual}` : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>أضعف يوم مبيعات</span>
                  <span className="font-mono text-ink">{data.kpis.lowestDay ? `${data.kpis.lowestDay.day} / ${data.kpis.lowestDay.totalActual}` : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>المتوسط اليومي</span>
                  <span className="font-mono text-ink">{data.kpis.avgDaily}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>أيام فروقات سالبة</span>
                  <span className="font-mono text-ink">{data.kpis.negativeDiffDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>الهامش النهائي</span>
                  <span className="font-mono text-ink">{data.kpis.margin}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>آخر المبيعات</CardTitle>
                <CardDescription>آخر القيود المسجلة في الفترة الحالية.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="surface-muted flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-ink">{sale.employeeName}</div>
                      <div className="text-xs text-slate">
                        {sale.saleDate} - كاشير #{sale.cashierNumber}
                      </div>
                    </div>
                    <div className="font-mono text-ink">{sale.totalActual}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>آخر المصروفات</CardTitle>
                <CardDescription>أحدث الحركات الخارجة من الصناديق.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentExpenses.map((expense) => (
                  <div key={expense.id} className="surface-muted flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-ink">{expense.category}</div>
                      <div className="text-xs text-slate">{expense.expenseDate}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-mono text-ink">{expense.amount}</div>
                      <Badge className="mt-1" variant={expense.status === "paid" ? "success" : expense.status === "late" ? "danger" : "warning"}>
                        {statusLabels[expense.status] ?? expense.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>نظرة سريعة على القاصات</CardTitle>
              <CardDescription>ملخص الرصيد المحتسب وفروقات الجرد لكل قاصة.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.boxes.map((box) => (
                <div key={box.id} className="surface-muted p-4">
                  <div className="text-sm font-semibold text-ink">{boxLabels[box.boxType] ?? box.boxType}</div>
                  <div className="mt-3 font-mono text-2xl text-ink">{box.calculatedBalance}</div>
                  <div className="mt-1 text-xs text-slate">فرق الجرد: {box.difference ?? "غير مسجل"}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </motion.section>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="metric-value">{value}</CardTitle>
        </div>
        <div className="rounded-2xl bg-mist p-3 text-olive">{icon}</div>
      </CardHeader>
    </Card>
  );
}
