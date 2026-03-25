import { useState, useEffect } from "react";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";

const now = new Date();
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");

function DiffCell({ val }) {
  const n = val || 0;
  if (n === 0) return <span className="cell-green">مطابق</span>;
  if (n > 0) return <span className="cell-green">+{fmtNum(n)}</span>;
  return <span className="cell-red">{fmtNum(n)}</span>;
}

const BOX_LABELS = {
  cash:"💵 كاش", master:"💳 ماستر", swish:"💱 سويج",
  sagi:"🔷 الساقي", other_elec:"💳 فيزا أخرى", bank:"🏦 البنك",
};

export default function ReportsMonthlyPage() {
  const { fmt } = useCurrency(); // Using Currency Context if needed
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async (m, y) => {
    setLoading(true); setErr("");
    try {
      const res = await api.get("/reports/monthly", { params: { month: m, year: y } });
      setData(res.data?.data || null);
    } catch (e) {
      setErr(e.response?.data?.message || "فشل تحميل التقرير");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(month, year); }, []);

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  const totals = data?.totals || {};
  const kpis = data?.kpis || {};
  const boxes = data?.boxes || [];
  const daily = data?.daily || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">🗓️ التقرير الشهري التحليلي</div>
          <div className="page-subtitle">ملخص شامل للشهر مع مؤشرات الأداء وجرد القاصات</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar mb-20">
        <select className="form-control" value={month} onChange={e => setMonth(+e.target.value)} style={{ width:120 }}>
          {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <input className="form-control" type="text" inputMode="numeric" value={year}
          onChange={e => setYear(+e.target.value)} style={{ width:90 }} placeholder="السنة" />
        <button className="btn btn-primary btn-sm" onClick={() => load(month, year)}>🔍 عرض التقرير</button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /> جاري التحميل...</div>
      ) : data && (
        <>
          {/* KPIs */}
          <div className="kpi-grid mb-24" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div className="kpi-card blue">
              <div className="kpi-icon">📊</div>
              <div className="kpi-label">صافي نظام الشهر</div>
              <div className="kpi-value neutral">{fmtNum(totals.totalNetSystem)}</div>
            </div>
            <div className="kpi-card green">
              <div className="kpi-icon">✅</div>
              <div className="kpi-label">إجمالي فعلي</div>
              <div className="kpi-value positive">{fmtNum(totals.totalActual)}</div>
            </div>
            <div className={`kpi-card ${(totals.finalDiff||0) >= 0 ? "green" : "red"}`}>
              <div className="kpi-icon">⚖️</div>
              <div className="kpi-label">فرق الصافيين</div>
              <div className={`kpi-value ${(totals.finalDiff||0) >= 0 ? "positive" : "negative"}`}>
                {fmtNum(totals.finalDiff)}
              </div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-icon">📈</div>
              <div className="kpi-label">أعلى يوم مبيعات</div>
              <div className="kpi-value" style={{ color:"var(--orange)", fontSize:17 }}>
                {kpis.highestDay ? `يوم ${kpis.highestDay.day} — ${fmtNum(kpis.highestDay.totalActual)}` : "—"}
              </div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-icon">📉</div>
              <div className="kpi-label">أدنى مبيعات</div>
              <div className="kpi-value" style={{ color:"var(--purple)", fontSize:17 }}>
                {kpis.lowestDay ? `يوم ${kpis.lowestDay.day} — ${fmtNum(kpis.lowestDay.totalActual)}` : "—"}
              </div>
            </div>
            <div className="kpi-card teal">
              <div className="kpi-icon">📊</div>
              <div className="kpi-label">متوسط يومي | هامش</div>
              <div className="kpi-value" style={{ color:"var(--teal)", fontSize:16 }}>
                {fmtNum(kpis.avgDaily)} | {(kpis.margin||0).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Daily Table */}
          <div className="table-wrapper mb-24">
            <div className="table-header">
              <span className="card-title">السجل اليومي التفصيلي — {monthNames[month-1]} {year}</span>
            </div>
            <div className="table-scroll">
              <table className="table" style={{ fontSize:12.5 }}>
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th className="cell-blue">▶ صافي نظام</th>
                    <th className="cell-green">▶ إجمالي فعلي</th>
                    <th>فارق</th>
                    <th className="cell-orange">تسديد شركات</th>
                    <th className="cell-purple">صرف داخلي</th>
                    <th style={{ fontWeight:800 }}>▶ صافي فعلي نهائي</th>
                    <th style={{ fontWeight:800 }}>فرق الصافيين</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map(r => (
                    <tr key={r.day}>
                      <td style={{ fontWeight:700 }}>يوم {r.day}</td>
                      <td className="cell-blue">{fmtNum(r.totalNetSystem)}</td>
                      <td className="cell-green">{fmtNum(r.totalActual)}</td>
                      <td><DiffCell val={r.diffTotal} /></td>
                      <td className="cell-orange">{fmtNum(r.companySettlement)}</td>
                      <td className="cell-purple">{fmtNum(r.internalSpend)}</td>
                      <td className="fw-bold" style={{ color:"#14532d" }}>{fmtNum(r.finalNetActual)}</td>
                      <td className="cell-bold"><DiffCell val={r.finalDiff} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-total-row">
                    <td>الإجمالي التراكمي</td>
                    <td className="cell-blue fw-black">{fmtNum(totals.totalNetSystem)}</td>
                    <td className="cell-green fw-black">{fmtNum(totals.totalActual)}</td>
                    <td><DiffCell val={totals.diffTotal || 0} /></td>
                    <td className="cell-orange fw-bold">{fmtNum(totals.companySettlement)}</td>
                    <td className="cell-purple fw-bold">{fmtNum(totals.internalSpend)}</td>
                    <td className="fw-black" style={{ color:"#14532d" }}>{fmtNum(totals.finalNetActual)}</td>
                    <td><DiffCell val={totals.finalDiff || 0} /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Box Summary */}
          {boxes.length > 0 && (
            <div className="table-wrapper mb-20">
              <div className="table-header">
                <span className="card-title">حركة حسابات القاصات — {monthNames[month-1]} {year}</span>
              </div>
              <div className="table-scroll">
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>القاصة</th>
                      <th>الرصيد الافتتاحي</th>
                      <th>(+) إيرادات فعلية</th>
                      <th>(-) مصروفات</th>
                      <th>(+) / (-) تحويلات</th>
                      <th>= رصيد محسوب</th>
                      <th>رصيد فعلي (مُدخل)</th>
                      <th>الفارق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.map(b => {
                      const diff = b.difference != null ? +b.difference : null;
                      return (
                        <tr key={b.id}>
                          <td className="fw-bold">{BOX_LABELS[b.boxType] || b.boxType}</td>
                          <td>{fmtNum(b.openingBalance)}</td>
                          <td className="cell-green">{fmtNum(b.incomeActual)}</td>
                          <td className="cell-red">{fmtNum(b.totalExpenses)}</td>
                          <td style={{ direction:"ltr", textAlign:"right" }}>
                            <span className="cell-green">+{fmtNum(b.transfersIn)}</span> / <span className="cell-red">-{fmtNum(b.transfersOut)}</span>
                          </td>
                          <td className="cell-blue fw-bold">{fmtNum(b.calculatedBalance)}</td>
                          <td className="fw-bold">
                            {b.actualBalance != null ? fmtNum(b.actualBalance) : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            {diff === null ? <span className="text-muted">—</span>
                              : diff > 0 ? <span className="cell-green">+{fmtNum(diff)}</span>
                              : diff < 0 ? <span className="cell-red">{fmtNum(diff)}</span>
                              : <span className="cell-green">مطابق ✓</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
