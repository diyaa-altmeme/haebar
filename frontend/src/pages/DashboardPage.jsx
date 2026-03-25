import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import api from "../api/client";

const now = new Date();
const MONTH = now.getMonth() + 1;
const YEAR = now.getFullYear();

const fmt = (v) => Number(v || 0).toLocaleString("en-US");

const BOX_LABELS = {
  cash: "💵 كاش",
  master: "💳 ماستر",
  swish: "💱 سويج",
  sagi: "🔷 الساقي",
  other_elec: "💳 فيزا أخرى",
  bank: "🏦 البنك",
};

const BOX_COLORS = {
  cash: "#1e40af",
  master: "#7c3aed",
  swish: "#059669",
  sagi: "#d97706",
  other_elec: "#dc2626",
  bank: "#0d9488",
};

const SHIFT_MAP = { morning: "☀️ صباحي", evening: "🌤 مسائي", night: "🌙 ليلي" };

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(MONTH);
  const [year, setYear] = useState(YEAR);

  const load = async (m, y) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/dashboard", { params: { month: m, year: y } });
      setData(res.data?.data ?? null);
    } catch (e) {
      setError(e.response?.data?.message || "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(month, year); }, []);

  const totals = data?.totals || {};
  const kpis = data?.kpis || {};
  const boxes = data?.boxes || [];
  const recentSales = data?.recentSales || [];
  const recentExpenses = data?.recentExpenses || [];
  const weeklySeries = data?.weeklySeries || [];

  const weeklyChartData = useMemo(() => 
    weeklySeries.map((w, i) => ({
      name: `أسبوع ${i + 1}`,
      "صافي نظام": +(w.totalNetSystem || 0).toFixed(0),
      "صافي فعلي": +(w.totalActual || 0).toFixed(0),
    })), [weeklySeries]);

  const pieData = [];
  const totalActual = +(totals.totalActual || 0);
  if (totalActual > 0) {
    const cashTotal = +(totals.cashActual || 0);
    const elecTotal = +(totals.elecActual || 0);
    if (cashTotal > 0) pieData.push({ name: "كاش", value: cashTotal });
    if (elecTotal > 0) pieData.push({ name: "إلكتروني", value: elecTotal });
  }

  const PIE_COLORS = ["#1e40af", "#059669"];

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">لوحة التحكم</div>
          <div className="page-subtitle">
            {monthNames[month-1]} {year} — نظرة عامة على الأداء المالي
          </div>
        </div>
        <div className="page-actions">
          <select
            className="form-control"
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            style={{ width: 110 }}
          >
            {monthNames.map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
          <input
            className="form-control"
            type="text"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            style={{ width: 90 }}
          />
          <button className="btn btn-primary" onClick={() => load(month, year)}>
            🔄 تحديث
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && (
        <div className="loading">
          <div className="spinner" />
          جاري تحميل البيانات...
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card blue">
              <div className="kpi-icon">📊</div>
              <div className="kpi-label">صافي نظام الشهر</div>
              <div className="kpi-value neutral">{fmt(totals.totalNetSystem)} <small style={{fontSize:11}}>د.ع</small></div>
            </div>
            <div className="kpi-card green">
              <div className="kpi-icon">✅</div>
              <div className="kpi-label">إجمالي فعلي</div>
              <div className="kpi-value positive">{fmt(totals.totalActual)} <small style={{fontSize:11}}>د.ع</small></div>
            </div>
            <div className={`kpi-card ${(totals.diffTotal||0) >= 0 ? "green" : "red"}`}>
              <div className="kpi-icon">⚖️</div>
              <div className="kpi-label">فارق الإجمالي</div>
              <div className={`kpi-value ${(totals.diffTotal||0) >= 0 ? "positive" : "negative"}`}>
                {(totals.diffTotal||0) >= 0 ? "+" : ""}{fmt(totals.diffTotal)} <small style={{fontSize:11}}>د.ع</small>
              </div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-icon">↩️</div>
              <div className="kpi-label">إجمالي المرتجعات</div>
              <div className="kpi-value" style={{color:"var(--orange)"}}>{fmt(totals.returns)} <small style={{fontSize:11}}>د.ع</small></div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-icon">💸</div>
              <div className="kpi-label">إجمالي المصروفات</div>
              <div className="kpi-value" style={{color:"var(--purple)"}}>{fmt((totals.companySettlement||0) + (totals.internalSpend||0))} <small style={{fontSize:11}}>د.ع</small></div>
            </div>
            <div className="kpi-card teal">
              <div className="kpi-icon">💹</div>
              <div className="kpi-label">صافي فعلي نهائي</div>
              <div className={`kpi-value ${(totals.finalNetActual||0) >= 0 ? "positive" : "negative"}`}>
                {fmt(totals.finalNetActual)} <small style={{fontSize:11}}>د.ع</small>
              </div>
            </div>
          </div>

          {/* Box Balances */}
          {boxes.length > 0 && (
            <div className="mb-24">
              <div className="card-title mb-16">أرصدة القاصات — {monthNames[month-1]} {year}</div>
              <div className="box-grid">
                {boxes.map((box) => {
                  const diff = box.difference != null ? +box.difference : null;
                  const diffClass = diff === null ? "" : diff > 0 ? "positive" : diff < 0 ? "negative" : "zero";
                  const diffText = diff === null ? "لم يُدخَل" : diff > 0 ? `زيادة +${fmt(diff)}` : diff < 0 ? `عجز ${fmt(diff)}` : "مطابق ✓";
                  return (
                    <div key={box.id} className="box-card">
                      <div className={`box-card-header ${box.boxType}`}>
                        {BOX_LABELS[box.boxType] || box.boxType}
                      </div>
                      <div className="box-card-body">
                        <div className="box-row">
                          <span className="box-row-label">رصيد افتتاحي</span>
                          <span className="box-row-value">{fmt(box.openingBalance)} د.ع</span>
                        </div>
                        <div className="box-row">
                          <span className="box-row-label">إيرادات فعلية</span>
                          <span className="box-row-value cell-green">{fmt(box.incomeActual)} د.ع</span>
                        </div>
                        <div className="box-row">
                          <span className="box-row-label">مصروفات</span>
                          <span className="box-row-value cell-red">{fmt(box.totalExpenses)} د.ع</span>
                        </div>
                        <div className="box-row">
                          <span className="box-row-label">تحويلات +/-</span>
                          <span className="box-row-value">
                            +{fmt(box.transfersIn)} / -{fmt(box.transfersOut)}
                          </span>
                        </div>
                        <div className="box-row">
                          <span className="box-row-label">رصيد محسوب</span>
                          <span className="box-row-value cell-blue fw-bold">{fmt(box.calculatedBalance)} د.ع</span>
                        </div>
                        {diff !== null && (
                          <div className={`box-difference ${diffClass}`}>
                            <span>الفارق</span>
                            <span>{diffText} د.ع</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="two-col mb-24">
            {weeklyChartData.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">المبيعات الأسبوعية</div>
                    <div className="card-subtitle">مقارنة نظام / فعلي</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyChartData} margin={{ top:5, right:10, left:10, bottom:5 }}>
                    <XAxis dataKey="name" tick={{ fontSize:12, fontFamily:"Cairo" }} />
                    <YAxis tick={{ fontSize:11 }} tickFormatter={(v) => (v/1000000).toFixed(1)+"M"} />
                    <Tooltip formatter={(v) => `${v.toLocaleString("en-US")} د.ع`} />
                    <Legend wrapperStyle={{ fontFamily:"Cairo", fontSize:12 }} />
                    <Bar dataKey="صافي نظام" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="صافي فعلي" fill="#059669" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">توزيع طرق الدفع</div>
                    <div className="card-subtitle">كاش مقابل إلكتروني</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v.toLocaleString("en-US")} د.ع`} />
                    <Legend wrapperStyle={{ fontFamily:"Cairo", fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="two-col">
            <div className="table-wrapper">
              <div className="table-header">
                <span className="card-title">💰 آخر المبيعات</span>
              </div>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>كاشير</th>
                      <th>الشفت</th>
                      <th>فعلي إجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign:"center", color:"var(--text-muted)", padding:20 }}>لا توجد بيانات</td></tr>
                    ) : recentSales.map((s) => (
                      <tr key={s.id}>
                        <td>{new Date(s.saleDate).toLocaleDateString("en-US")}</td>
                        <td>#{s.cashierNumber}</td>
                        <td>{SHIFT_MAP[s.shift]}</td>
                        <td className="cell-green fw-bold">{fmt(s.totalActual)} د.ع</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-wrapper">
              <div className="table-header">
                <span className="card-title">📋 آخر المصروفات</span>
              </div>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>التبويب</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExpenses.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign:"center", color:"var(--text-muted)", padding:20 }}>لا توجد بيانات</td></tr>
                    ) : recentExpenses.map((ex) => (
                      <tr key={ex.id}>
                        <td>{new Date(ex.expenseDate).toLocaleDateString("en-US")}</td>
                        <td>{ex.category}</td>
                        <td className="cell-red fw-bold">{fmt(ex.amount)} د.ع</td>
                        <td>
                          <span className={`badge ${ex.status==="paid" ? "badge-success" : ex.status==="pending" ? "badge-warning" : "badge-danger"}`}>
                            {ex.status==="paid" ? "مسدد" : ex.status==="pending" ? "قيد التسديد" : "متأخر"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
