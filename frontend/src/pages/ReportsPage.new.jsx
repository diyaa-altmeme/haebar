import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  FileText,
  Search,
  ArrowRightLeft,
  Receipt,
  Edit
} from "lucide-react";

const now = new Date();
const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const fmtNum = (v) => {
  const n = Number(v || 0);
  if (n === 0) return "—";
  return n.toLocaleString("en-US");
};

function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <div className="premium-section" style={{ flex: 1, minWidth: 200 }}>
       <div className="premium-section-body" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ 
            width: 42, height: 42, borderRadius: 10, background: `${color}15`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: color 
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>{value}</div>
            {subtitle && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
          </div>
       </div>
    </div>
  );
}

function DiffCell({ val }) {
  const n = val || 0;
  if (n === 0) return <span style={{ color: '#10b981', fontWeight: 700 }}>مطابق</span>;
  return (
    <span style={{ color: n > 0 ? '#10b981' : '#ef4444', fontWeight: 800, dir: 'ltr', display: 'inline-block' }}>
      {n > 0 ? `+${fmtNum(n)}` : fmtNum(n)}
    </span>
  );
}

export default function ReportsPage() {
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily"); 
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDay, setFilterDay] = useState(now.getDate());
  const [filterWeek, setFilterWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState({}); // { [day]: shifts[] }
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const loadReport = async () => {
    setLoading(true);
    setErr("");
    setExpandedDay(null);
    setDayDetails({});
    try {
      const res = await api.get("/reports/monthly", { params: { month: filterMonth, year: filterYear } });
      setData(res.data?.data || null);
    } catch (e) {
      setErr("❌ فشل تحميل التقرير الشامل");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = async (day) => {
    if (expandedDay === day) {
      setExpandedDay(null);
      return;
    }
    setExpandedDay(day);
    if (!dayDetails[day]) {
      try {
        const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const res = await api.get(`/sales/day?date=${dateStr}`);
        setDayDetails(prev => ({ ...prev, [day]: res.data?.data || [] }));
      } catch (e) {
        console.error("Failed to fetch day details", e);
      }
    }
  };

  useEffect(() => { loadReport(); }, [filterMonth, filterYear]);

  if (loading && !data) return <div className="loading"><div className="spinner"/> جاري تجهيز التقرير الشامل...</div>;

  const totals = data?.totals || {};
  const dailyRows = data?.daily || [];
  const weeklyRows = data?.weekly || [];
  const kpis = data?.kpis || {};

  // Filtering Logic
  const filteredDaily = dailyRows.filter(r => r.day === filterDay);
  const weekRanges = [
    { label: "الأسبوع الأول (1-7)", start: 1, end: 7 },
    { label: "الأسبوع الثاني (8-14)", start: 8, end: 14 },
    { label: "الأسبوع الثالث (15-21)", start: 15, end: 21 },
    { label: "الأسبوع الرابع والمتبقي (22-31)", start: 22, end: 31 }
  ];
  const selectedRange = weekRanges[filterWeek - 1];
  const filteredWeeklyDays = dailyRows.filter(r => r.day >= selectedRange.start && r.day <= selectedRange.end);
  const selectedWeekSummary = weeklyRows[filterWeek - 1] || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header & Unified Year/Month Filter */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-title">📊 مركز التقارير الموحد</div>
          <div className="page-subtitle">تحليل كامل للمبيعات، المصروفات، والأرباح</div>
        </div>
        <div className="page-actions" style={{ gap: 8 }}>
          <div className="premium-input-group" style={{ display: 'flex', gap: 5, background: '#fff', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <select className="premium-input" style={{ border: 0, width: 110, height: 32 }} value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
               {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <input className="premium-input" style={{ border: 0, width: 80, height: 32, textAlign: 'center' }} type="text" inputMode="numeric" value={filterYear} onChange={e => setFilterYear(+e.target.value)} />
            <button className="btn btn-primary" style={{ padding: '0 12px', height: 32 }} onClick={loadReport}><Search size={14} /></button>
          </div>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* Tab Switcher & Sub-Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
           <button className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-ghost'}`} 
             style={{ borderRadius: '10px 10px 0 0', padding: '10px 20px', fontSize: 13, borderBottom: activeTab === 'daily' ? '3px solid #1e40af' : '0' }}
             onClick={() => setActiveTab('daily')}>📅 السجل اليومي</button>
           <button className={`btn ${activeTab === 'weekly' ? 'btn-primary' : 'btn-ghost'}`} 
             style={{ borderRadius: '10px 10px 0 0', padding: '10px 20px', fontSize: 13, borderBottom: activeTab === 'weekly' ? '3px solid #1e40af' : '0' }}
             onClick={() => setActiveTab('weekly')}>📆 الملخص الأسبوعي</button>
           <button className={`btn ${activeTab === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} 
             style={{ borderRadius: '10px 10px 0 0', padding: '10px 20px', fontSize: 13, borderBottom: activeTab === 'monthly' ? '3px solid #1e40af' : '0' }}
             onClick={() => setActiveTab('monthly')}>🗓️ التقرير الشهري</button>
        </div>

        {/* Sub-Filters based on Tab */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            {activeTab === 'daily' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>اختر اليوم:</span>
                 <select className="premium-input" style={{ width: 80, height: 28 }} value={filterDay} onChange={e => setFilterDay(+e.target.value)}>
                    {dailyRows.map(r => <option key={r.day} value={r.day}>{r.day}</option>)}
                 </select>
              </div>
            )}
            {activeTab === 'weekly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>اختر الأسبوع:</span>
                 <select className="premium-input" style={{ width: 180, height: 28 }} value={filterWeek} onChange={e => setFilterWeek(+e.target.value)}>
                    {weekRanges.map((w, idx) => <option key={idx+1} value={idx+1}>{w.label}</option>)}
                 </select>
              </div>
            )}
            {activeTab === 'monthly' && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>عرض كافة أيام الشهر والملخصات الختامية</span>
            )}
        </div>
      </div>

      {/* Summary Stats Cards - Dynamic based on level */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard 
          title="المبيعات الفعلية" 
          value={fmt(activeTab === 'monthly' ? totals.totalActual : (activeTab === 'weekly' ? selectedWeekSummary.totalActual : filteredDaily[0]?.totalActual))} 
          icon={<TrendingUp size={20}/>} color="#10b981" 
        />
        <StatCard 
          title="صافي النظام" 
          value={fmt(activeTab === 'monthly' ? totals.totalNetSystem : (activeTab === 'weekly' ? selectedWeekSummary.totalNetSystem : filteredDaily[0]?.totalNetSystem))} 
          icon={<DollarSign size={20}/>} color="#3b82f6" 
        />
        <StatCard 
          title="المصاريف" 
          value={fmt(activeTab === 'monthly' ? (totals.companySettlement + totals.internalSpend) : (activeTab === 'weekly' ? (selectedWeekSummary.companySettlement + selectedWeekSummary.internalSpend) : (filteredDaily[0]?.companySettlement + filteredDaily[0]?.internalSpend)))} 
          icon={<TrendingDown size={20}/>} color="#ef4444" 
        />
        <StatCard 
          title="الصافي الفعلي" 
          value={fmt(activeTab === 'monthly' ? totals.finalNetActual : (activeTab === 'weekly' ? selectedWeekSummary.finalNetActual : filteredDaily[0]?.finalNetActual))} 
          icon={<PieChart size={20}/>} color="#8b5cf6" 
        />
      </div>

      {/* Main Report Table Area */}
      <div className="exchange-wrapper">
        <div className="table-scroll">
          <table className="exchange-table">
            <thead>
              <tr>
                <th>{activeTab === 'daily' ? 'اليوم' : 'الفترة/اليوم'}</th>
                <th>صافي نظام</th>
                <th>صافي فعلي</th>
                <th>مرتجع</th>
                <th style={{ textAlign: 'center' }}>الفوارق المباشرة</th>
                <th>مصروفات</th>
                <th>الصافي النهائي</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'daily' ? filteredDaily : (activeTab === 'weekly' ? filteredWeeklyDays : dailyRows)).map(r => (
                <Fragment key={r.day}>
                  <tr 
                    onClick={() => toggleDay(r.day)} 
                    style={{ cursor: 'pointer' }}
                    className={expandedDay === r.day ? 'row-expanded' : ''}
                  >
                    <td style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <button className="circle-btn">▼</button>
                       يوم {r.day}
                    </td>
                    <td className="cell-blue">{fmtNum(r.totalNetSystem)}</td>
                    <td className="cell-green">{fmtNum(r.totalActual)}</td>
                    <td className="cell-red">{fmtNum(r.returns)}</td>
                    <td style={{ textAlign: 'center' }}><DiffCell val={r.diffTotal} /></td>
                    <td className="cell-orange">{fmtNum(r.companySettlement + r.internalSpend)}</td>
                    <td className="cell-net">{fmtNum(r.finalNetActual)}</td>
                  </tr>
                  
                  {expandedDay === r.day && (
                    <tr className="exchange-details-row">
                      <td colSpan={7}>
                        <div className="exchange-details-container">
                            <div className="exchange-details-title">
                               📂 السجل التفصيلي للشفتات والعمليات
                            </div>
                            <table className="exchange-nested-table">
                                <thead>
                                   <tr>
                                      <th>توقيت التقفيلة</th>
                                      <th>الكاشير المناوب</th>
                                      <th>إدخال بواسطة</th>
                                      <th>التاريخ النظامي</th>
                                      <th>فترة العمل</th>
                                      <th>الكاش</th>
                                      <th>الإلكتروني</th>
                                      <th>الفارق</th>
                                      <th style={{ textAlign: 'center' }}>الإجراءات</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {(!dayDetails[r.day] || dayDetails[r.day].length === 0) ? (
                                      <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8' }}>{dayDetails[r.day] ? 'لا توجد بيانات عمليات دقيقة' : 'جاري جلب البيانات...'}</td></tr>
                                   ) : dayDetails[r.day].map(s => (
                                     <tr key={s.id}>
                                        <td style={{ fontWeight: 800, color: '#0f172a', dir: 'ltr', textAlign: 'center' }}>{s.entryTime || "—"}</td>
                                        <td>
                                           <div style={{ color: '#0f172a', fontWeight: 800 }}>{s.employee?.name || `كاشير ${s.cashierNumber}`}</div>
                                           <div style={{ fontSize: 10, color: '#64748b' }}>شفت: {s.shift === 'morning' ? 'صباحي' : (s.shift === 'evening' ? 'مسائي' : 'ليلي')}</div>
                                        </td>
                                        <td>
                                           <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 700 }}>
                                              {s.enteredByUser?.name || 'مجهول'}
                                           </span>
                                        </td>
                                        <td style={{ fontSize: 11.5, color: '#64748b', dir: 'ltr', textAlign: 'center', fontWeight: 600 }}>
                                           {new Date(s.createdAt).toLocaleString('en-GB', { hour12: true, dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td style={{ fontWeight: 800, color: '#3b82f6' }}>بيع / إيراد</td>
                                        <td className="cell-green" style={{ background: '#f0fdf4' }}>{fmtNum(s.cashActual)} <span style={{fontSize:9, color: '#16a34a'}}>د.ع</span></td>
                                        <td className="cell-green" style={{ background: '#f0fdf4' }}>{fmtNum(s.totalElecActual)} <span style={{fontSize:9, color: '#16a34a'}}>د.ع</span></td>
                                        <td style={{ background: '#f8fafc' }}><DiffCell val={s.diffTotal} /></td>
                                        <td style={{ textAlign: 'center' }}>
                                           <button 
                                              className="btn-ledger-edit"
                                              onClick={(e) => { e.stopPropagation(); navigate(`/sales?edit=${s.id}`); }}
                                           >
                                              <Edit size={12} /> تعديل
                                           </button>
                                        </td>
                                     </tr>
                                   ))}
                                </tbody>
                            </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="exchange-summary-row">
                <td className="exchange-summary-label">إجمالي القائمة المسجلة للفترة</td>
                <td className="cell-blue">{fmtNum(activeTab === 'monthly' ? totals.totalNetSystem : (activeTab === 'weekly' ? selectedWeekSummary.totalNetSystem : filteredDaily[0]?.totalNetSystem))}</td>
                <td className="cell-green">{fmtNum(activeTab === 'monthly' ? totals.totalActual : (activeTab === 'weekly' ? selectedWeekSummary.totalActual : filteredDaily[0]?.totalActual))}</td>
                <td className="cell-red">{fmtNum(activeTab === 'monthly' ? totals.returns : (activeTab === 'weekly' ? selectedWeekSummary.returns : filteredDaily[0]?.returns))}</td>
                <td style={{ textAlign: 'center' }}><DiffCell val={activeTab === 'monthly' ? totals.diffTotal : (activeTab === 'weekly' ? selectedWeekSummary.diffTotal : filteredDaily[0]?.diffTotal)} /></td>
                <td className="cell-orange">{fmtNum(activeTab === 'monthly' ? (totals.companySettlement + totals.internalSpend) : (activeTab === 'weekly' ? (selectedWeekSummary.companySettlement + selectedWeekSummary.internalSpend) : (filteredDaily[0]?.companySettlement + filteredDaily[0]?.internalSpend)))}</td>
                <td className="cell-net">{fmtNum(activeTab === 'monthly' ? totals.finalNetActual : (activeTab === 'weekly' ? selectedWeekSummary.finalNetActual : filteredDaily[0]?.finalNetActual))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Display KPIs only in Monthly Tab for depth */}
        {activeTab === 'monthly' && (
           <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                 <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>🔍 إحصائيات الأداء القياسية:</div>
                 <div style={{ fontSize: 12, color: '#475569' }}>أعلى إيراد يومي: <span className="cell-green fw-bold">{fmt(kpis.highestDay?.totalActual)} (يوم {kpis.highestDay?.day})</span></div>
                 <div style={{ fontSize: 12, color: '#475569' }}>أقل إيراد يومي: <span className="cell-red fw-bold">{fmt(kpis.lowestDay?.totalActual)} (يوم {kpis.lowestDay?.day})</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                 <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>🧾 تحليل المصاريف والمساهمات:</div>
                 <div style={{ fontSize: 12, color: '#444' }}>مدفوعات شركات: <strong>{fmt(totals.companySettlement)}</strong></div>
                 <div style={{ fontSize: 12, color: '#444' }}>نثريات داخلية: <strong>{fmt(totals.internalSpend)}</strong></div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
