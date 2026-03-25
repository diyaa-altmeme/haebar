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

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function ReportsDailyPage() {
  const { fmt } = useCurrency();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async (m, y) => {
    setLoading(true); setErr("");
    try {
      const res = await api.get("/reports/daily", { params: { month: m, year: y } });
      setRows(res.data?.data || []);
    } catch (e) { setErr(e.response?.data?.message || "فشل التحميل"); } finally { setLoading(false); }
  };
  useEffect(() => { load(month, year); }, []);

  const totalRow = rows.reduce((acc, r) => {
    Object.keys(r).forEach(k => { if (k !== "day") acc[k] = (acc[k] || 0) + (+r[k] || 0); });
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📅 السجل اليومي</div>
          <div className="page-subtitle">تفصيلي يومي — {monthNames[month-1]} {year}</div>
        </div>
        <div className="page-actions">
          <select className="form-control" value={month} onChange={e => setMonth(+e.target.value)} style={{ width:110 }}>
            {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <input className="form-control" type="text" inputMode="numeric" value={year}
            onChange={e => setYear(+e.target.value)} style={{ width:90 }} />
          <button className="btn btn-primary" onClick={() => load(month, year)}>🔍</button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <div className="table-header">
            <span className="card-title">{monthNames[month-1]} {year} — {rows.length} يوم</span>
            {rows.length > 0 && <span className="badge badge-info">النظام: {fmt(totalRow.totalNetSystem || 0)} | الفعلي: {fmt(totalRow.totalActual || 0)}</span>}
          </div>
          <div className="table-scroll">
            <table className="table" style={{ fontSize:12 }}>
              <thead>
                <tr>
                  <th>اليوم</th>
                  <th style={{ color:"var(--primary)", background:"#eff6ff" }}>كاش نظام</th>
                  <th style={{ color:"var(--primary)", background:"#eff6ff" }}>إلك نظام</th>
                  <th style={{ color:"var(--danger)" }}>مرتجع</th>
                  <th style={{ background:"#dbeafe", color:"#1e40af", fontWeight:800 }}>▶ صافي نظام</th>
                  <th style={{ color:"var(--success)", background:"#f0fdf4" }}>كاش فعلي</th>
                  <th style={{ color:"var(--success)", background:"#f0fdf4" }}>إلك فعلي</th>
                  <th style={{ background:"#d1fae5", color:"#065f46", fontWeight:800 }}>▶ إجمالي فعلي</th>
                  <th>فارق كاش</th>
                  <th>فارق إلك</th>
                  <th style={{ fontWeight:800 }}>▶ فارق إجمالي</th>
                  <th style={{ color:"var(--orange)" }}>تسديد شركات</th>
                  <th style={{ color:"var(--purple)" }}>صرف داخلي</th>
                  <th style={{ fontWeight:800, color:"#1e3a8a" }}>▶ صافي نظام نهائي</th>
                  <th style={{ fontWeight:800, color:"#14532d" }}>▶ صافي فعلي نهائي</th>
                  <th style={{ fontWeight:800 }}>▶ فرق الصافيين</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={16}><div className="empty-state"><span className="icon">📅</span><p>لا توجد بيانات</p></div></td></tr>
                ) : rows.map(r => (
                  <tr key={r.day}>
                    <td style={{ fontWeight:700 }}>يوم {r.day}</td>
                    <td className="cell-blue">{fmtNum(r.cashSystem)}</td>
                    <td className="cell-blue">{fmtNum(r.elecSystem)}</td>
                    <td className="cell-red">{fmtNum(r.returns)}</td>
                    <td className="cell-bold cell-blue">{fmtNum(r.totalNetSystem)}</td>
                    <td className="cell-green">{fmtNum(r.cashActual)}</td>
                    <td className="cell-green">{fmtNum(r.elecActual)}</td>
                    <td className="cell-bold cell-green">{fmtNum(r.totalActual)}</td>
                    <td><DiffCell val={r.diffCash} /></td>
                    <td><DiffCell val={r.diffElec} /></td>
                    <td className="cell-bold"><DiffCell val={r.diffTotal} /></td>
                    <td className="cell-orange">{fmtNum(r.companySettlement)}</td>
                    <td className="cell-purple">{fmtNum(r.internalSpend)}</td>
                    <td className="cell-bold" style={{ color:"#1e3a8a" }}>{fmtNum(r.finalNetSystem)}</td>
                    <td className="cell-bold" style={{ color:"#14532d" }}>{fmtNum(r.finalNetActual)}</td>
                    <td className="cell-bold"><DiffCell val={r.finalDiff} /></td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="table-total-row">
                    <td>الإجمالي</td>
                    <td>{fmtNum(totalRow.cashSystem)}</td>
                    <td>{fmtNum(totalRow.elecSystem)}</td>
                    <td>{fmtNum(totalRow.returns)}</td>
                    <td className="cell-blue fw-black">{fmtNum(totalRow.totalNetSystem)}</td>
                    <td>{fmtNum(totalRow.cashActual)}</td>
                    <td>{fmtNum(totalRow.elecActual)}</td>
                    <td className="cell-green fw-black">{fmtNum(totalRow.totalActual)}</td>
                    <td><DiffCell val={totalRow.diffCash || 0} /></td>
                    <td><DiffCell val={totalRow.diffElec || 0} /></td>
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
      )}
    </div>
  );
}
