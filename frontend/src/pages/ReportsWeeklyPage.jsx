import { useState, useEffect } from "react";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";

const now = new Date();
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");

const WEEK_LABELS = ["الأسبوع الأول (1-7)", "الأسبوع الثاني (8-14)", "الأسبوع الثالث (15-21)", "الأسبوع الرابع (22-31)"];

function DiffCell({ val }) {
  const n = val || 0;
  if (n === 0) return <span className="cell-green">مطابق</span>;
  if (n > 0) return <span className="cell-green">+{fmtNum(n)}</span>;
  return <span className="cell-red">{fmtNum(n)}</span>;
}

export default function ReportsWeeklyPage() {
  const { fmt } = useCurrency();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async (m, y) => {
    setLoading(true); setErr("");
    try {
      const res = await api.get("/reports/weekly", { params: { month: m, year: y } });
      setWeeks(res.data?.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || "فشل تحميل التقرير");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(month, year); }, []);

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  const totalRow = weeks.reduce((acc, w) => {
    Object.keys(w).forEach(k => { if (k !== "week") acc[k] = (acc[k] || 0) + (w[k] || 0); });
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📆 الملخص الأسبوعي</div>
          <div className="page-subtitle">إجماليات الأسابيع الأربعة للشهر</div>
        </div>
      </div>

      <div className="filter-bar mb-16">
        <select className="form-control" value={month} onChange={e => setMonth(+e.target.value)} style={{ width:120 }}>
          {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <input className="form-control" type="text" inputMode="numeric" value={year}
          onChange={e => setYear(+e.target.value)} style={{ width:90 }} placeholder="السنة" />
        <button className="btn btn-primary btn-sm" onClick={() => load(month, year)}>🔍 بحث</button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /> جاري التحميل...</div>
      ) : (
        <>
          {/* Weekly summary cards */}
          <div className="kpi-grid mb-20" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))" }}>
            {weeks.map((w, i) => (
              <div key={i} className="kpi-card blue">
                <div className="kpi-label">{WEEK_LABELS[i]}</div>
                <div className="kpi-value neutral" style={{ fontSize:18 }}>{fmt(w.totalNetSystem)}</div>
                <div className="kpi-sub">الفعلي: {fmt(w.totalActual)}</div>
              </div>
            ))}
          </div>

          <div className="table-wrapper">
            <div className="table-header">
              <span className="card-title">جدول التفاصيل الأسبوعية</span>
            </div>
            <div className="table-scroll">
              <table className="table" style={{ fontSize:12.5 }}>
                <thead>
                  <tr>
                    <th>الأسبوع</th>
                    <th className="cell-blue">كاش نظام</th>
                    <th className="cell-blue">إلك نظام</th>
                    <th className="cell-red">مرتجع</th>
                    <th style={{ background:"#dbeafe", color:"#1e40af", fontWeight:800 }}>▶ صافي نظام</th>
                    <th className="cell-green">كاش فعلي</th>
                    <th className="cell-green">إلك فعلي</th>
                    <th style={{ background:"#d1fae5", color:"#065f46", fontWeight:800 }}>▶ إجمالي فعلي</th>
                    <th>فارق إجمالي</th>
                    <th className="cell-orange">تسديد شركات</th>
                    <th className="cell-purple">صرف داخلي</th>
                    <th style={{ fontWeight:800 }}>▶ صافي نظام نهائي</th>
                    <th style={{ fontWeight:800 }}>▶ صافي فعلي نهائي</th>
                    <th style={{ fontWeight:800 }}>▶ فرق الصافيين</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>{WEEK_LABELS[i]}</td>
                      <td className="cell-blue">{fmtNum(w.cashSystem)}</td>
                      <td className="cell-blue">{fmtNum(w.elecSystem)}</td>
                      <td className="cell-red">{fmtNum(w.returns)}</td>
                      <td className="cell-bold cell-blue">{fmtNum(w.totalNetSystem)}</td>
                      <td className="cell-green">{fmtNum(w.cashActual)}</td>
                      <td className="cell-green">{fmtNum(w.elecActual)}</td>
                      <td className="cell-bold cell-green">{fmtNum(w.totalActual)}</td>
                      <td className="cell-bold"><DiffCell val={w.diffTotal} /></td>
                      <td className="cell-orange">{fmtNum(w.companySettlement)}</td>
                      <td className="cell-purple">{fmtNum(w.internalSpend)}</td>
                      <td className="fw-bold" style={{ color:"#1e3a8a" }}>{fmtNum(w.finalNetSystem)}</td>
                      <td className="fw-bold" style={{ color:"#14532d" }}>{fmtNum(w.finalNetActual)}</td>
                      <td className="cell-bold"><DiffCell val={w.finalDiff} /></td>
                    </tr>
                  ))}
                </tbody>
                {weeks.length > 0 && (
                  <tfoot>
                    <tr className="table-total-row">
                      <td>إجمالي الشهر</td>
                      <td>{fmtNum(totalRow.cashSystem)}</td>
                      <td>{fmtNum(totalRow.elecSystem)}</td>
                      <td>{fmtNum(totalRow.returns)}</td>
                      <td className="cell-blue fw-black">{fmtNum(totalRow.totalNetSystem)}</td>
                      <td>{fmtNum(totalRow.cashActual)}</td>
                      <td>{fmtNum(totalRow.elecActual)}</td>
                      <td className="cell-green fw-black">{fmtNum(totalRow.totalActual)}</td>
                      <td><DiffCell val={totalRow.diffTotal || 0} /></td>
                      <td className="cell-orange fw-bold">{fmtNum(totalRow.companySettlement)}</td>
                      <td className="cell-purple fw-bold">{fmtNum(totalRow.internalSpend)}</td>
                      <td className="fw-black" style={{ color:"#1e3a8a" }}>{fmtNum(totalRow.finalNetSystem)}</td>
                      <td className="fw-black" style={{ color:"#14532d" }}>{fmtNum(totalRow.finalNetActual)}</td>
                      <td><DiffCell val={totalRow.finalDiff || 0} /></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
