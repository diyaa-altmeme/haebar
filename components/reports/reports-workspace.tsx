"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DailyRow = {
  day: number;
  totalNetSystem: string;
  totalActual: string;
  returns: string;
  diffTotal: string;
  companySettlement: string;
  internalSpend: string;
  totalExpenses: string;
  finalNetActual: string;
};

type WeeklyRow = {
  week: string;
  totalNetSystem: string;
  totalActual: string;
  returns: string;
  diffTotal: string;
  companySettlement: string;
  internalSpend: string;
  totalExpenses: string;
  finalNetActual: string;
};

type MonthlyReport = {
  daily: DailyRow[];
  weekly: WeeklyRow[];
  totals: {
    totalNetSystem: string;
    totalActual: string;
    returns: string;
    diffTotal: string;
    companySettlement: string;
    internalSpend: string;
    totalExpenses: string;
    finalNetActual: string;
  };
  kpis: {
    highestDay: { day: number; totalActual: string } | null;
    lowestDay: { day: number; totalActual: string } | null;
    avgDaily: string;
    negativeDiffDays: number;
    margin: string;
  };
};

export function ReportsWorkspace() {
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"daily" | "weekly" | "summary">("daily");

  async function loadReport() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/reports/monthly?month=${month}&year=${year}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: MonthlyReport; error?: string };

    if (!response.ok || !payload.data) {
      setLoading(false);
      setError(payload.error ?? "تعذر تحميل التقرير الشهري.");
      return;
    }

    setReport(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const rows = tab === "daily" ? report?.daily ?? [] : tab === "weekly" ? report?.weekly ?? [] : [];

  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>التقارير</CardTitle>
              <CardDescription>تقارير يومية وأسبوعية وشهرية مبنية بالكامل على طبقة الخدمات الجديدة في الخلفية.</CardDescription>
            </div>
            <div className="flex gap-3">
              <Input className="w-20" value={month} onChange={(event) => setMonth(event.target.value)} />
              <Input className="w-28" value={year} onChange={(event) => setYear(event.target.value)} />
              <Button variant="outline" onClick={() => void loadReport()}>
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex gap-3">
        <Button variant={tab === "daily" ? "default" : "outline"} onClick={() => setTab("daily")}>
          يومي
        </Button>
        <Button variant={tab === "weekly" ? "default" : "outline"} onClick={() => setTab("weekly")}>
          أسبوعي
        </Button>
        <Button variant={tab === "summary" ? "default" : "outline"} onClick={() => setTab("summary")}>
          شهري
        </Button>
      </div>

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading || !report ? (
        <div className="surface flex min-h-[320px] items-center justify-center text-slate">
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          جار تحميل التقرير
        </div>
      ) : tab === "summary" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>إجماليات الشهر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate">
              <SummaryRow label="صافي النظام" value={report.totals.totalNetSystem} />
              <SummaryRow label="الإجمالي الفعلي" value={report.totals.totalActual} />
              <SummaryRow label="المرتجعات" value={report.totals.returns} />
              <SummaryRow label="الفروقات" value={report.totals.diffTotal} />
              <SummaryRow label="تسديد الشركات" value={report.totals.companySettlement} />
              <SummaryRow label="المصروف الداخلي" value={report.totals.internalSpend} />
              <SummaryRow label="إجمالي المصروفات" value={report.totals.totalExpenses} />
              <SummaryRow label="الصافي النهائي" value={report.totals.finalNetActual} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>مؤشرات الأداء</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate">
              <SummaryRow label="أفضل يوم" value={report.kpis.highestDay ? `${report.kpis.highestDay.day} / ${report.kpis.highestDay.totalActual}` : "-"} />
              <SummaryRow label="أضعف يوم" value={report.kpis.lowestDay ? `${report.kpis.lowestDay.day} / ${report.kpis.lowestDay.totalActual}` : "-"} />
              <SummaryRow label="المتوسط اليومي" value={report.kpis.avgDaily} />
              <SummaryRow label="أيام الفروقات السالبة" value={String(report.kpis.negativeDiffDays)} />
              <SummaryRow label="الهامش النهائي" value={`${report.kpis.margin}%`} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{tab === "daily" ? "التقرير اليومي" : "التقرير الأسبوعي"}</CardTitle>
            <CardDescription>كل الأرقام هنا قادمة من خدمات الخلفية دون أي حسابات مالية داخل الواجهة.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tab === "daily" ? "اليوم" : "الفترة"}</th>
                  <th>صافي النظام</th>
                  <th>الإجمالي الفعلي</th>
                  <th>المرتجعات</th>
                  <th>الفروقات</th>
                  <th>المصروفات</th>
                  <th>الصافي النهائي</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={tab === "daily" ? String((row as DailyRow).day) : (row as WeeklyRow).week}>
                    <td>{tab === "daily" ? `يوم ${(row as DailyRow).day}` : (row as WeeklyRow).week}</td>
                    <td className="font-mono">{row.totalNetSystem}</td>
                    <td className="font-mono">{row.totalActual}</td>
                    <td className="font-mono">{row.returns}</td>
                    <td className="font-mono">{row.diffTotal}</td>
                    <td className="font-mono">{row.totalExpenses}</td>
                    <td className="font-mono">{row.finalNetActual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </motion.section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  );
}
