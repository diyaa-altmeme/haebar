import { useState, useEffect } from "react";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import DatePicker from "react-datepicker";
import { Calendar, Clock } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import Modal from "../components/Modal";

const now = new Date();
const denominations = [250, 500, 1000, 5000, 10000, 25000, 50000, 100000];
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");
const parseNum = (s) => parseFloat(String(s).replace(/,/g, "") || "0") || 0;

function initBreakdown() {
  return denominations.map(d => ({ denomination: d, count: 0 }));
}

const SHIFT_OPTIONS = [
  { value: "morning", label: "☀️ صباحي (08:00–16:00)" },
  { value: "evening", label: "🌤 مسائي (16:00–00:00)" },
  { value: "night",   label: "🌙 ليلي (00:00–08:00)" },
];

const SHIFT_LABELS = {
  morning: "☀️ صباحي",
  evening: "🌤 مسائي",
  night: "🌙 ليلي"
};

const ELEC_CONFIG = [
  { key: "inclusive", label: "شامل - الكل" },
  { key: "master", label: "ماستر" },
  { key: "swish",  label: "سويج" },
  { key: "sagi",   label: "الساقي" },
  { key: "otherElec", label: "فيزا أخرى" },
];

function DiffBox({ label, val, act, sys }) {
  const cls = val > 0 ? "positive" : val < 0 ? "negative" : "zero";
  const desc = val > 0 ? "زيادة في الدرج (إفادة)" : val < 0 ? "نقص في الدرج (عجز)" : "مطابق تماماً";
  return (
    <div className={`premium-diff-box ${cls}`}>
      <div className="premium-diff-label">{label}</div>
      <div className="premium-diff-value">{fmtNum(Math.abs(val))}</div>
      <div className="premium-diff-badge">{desc}</div>
      {(act !== undefined && sys !== undefined) && (
        <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 4, display: 'flex', gap: 6, opacity: 0.8 }}>
          <span>الفعلي: {fmtNum(act)}</span>
          <span>|</span>
          <span>النظام: {fmtNum(sys)}</span>
        </div>
      )}
    </div>
  );
}

export default function SalesEntryPage() {
  const { fmt, currencies } = useCurrency();
  const [employees, setEmployees] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [breakdown, setBreakdown] = useState(initBreakdown());
  const [showCalc, setShowCalc] = useState(false);

  const emptyForm = {
    employeeId: "", cashierNumber: "", shift: "morning",
    date: now, // Store as Date object for DatePicker
    cashActual: "",
    cashSystem: "",
    returns: "",
    systemElectronic: [
      { type: "master", amount: "" }
    ],
    actualElectronic: [
      { type: "master", amount: "" }
    ],
    currencyCode: "IQD",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const setField = (k, v) => {
    let finalVal = v;
    if (["cashActual", "cashSystem", "returns"].includes(k)) {
      // Normalize numeric entries for consistent conversion in toBase
      if (typeof v === 'string') {
        const parsed = parseNum(v);
        finalVal = parsed === 0 && (v === '' || v === '0' || v === '0.0') ? '' : parsed.toString();
      }
    }
    setForm(f => ({ ...f, [k]: finalVal }));
  };

  useEffect(() => {
    api.get("/employees").then(r => setEmployees(r.data?.data || [])).catch(() => {});
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales", { params: { month: filterMonth, year: filterYear } });
      setSales(res.data?.data || []);
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { loadSales(); }, [filterMonth, filterYear]);

  const handleEmployeeChange = (id) => {
    const emp = employees.find(e => e.id === id);
    setForm(f => ({
      ...f, employeeId: id,
      cashierNumber: emp ? String(emp.cashierNumber) : "",
      shift: emp ? emp.shift : f.shift,
    }));
  };

  const handleBreakdown = (idx, count) => {
    const next = [...breakdown];
    next[idx] = { ...next[idx], count: parseNum(count) }; // count is often small, but parseNum is safe
    setBreakdown(next);
  };

  const addSystemElec = () => setForm(f => ({ ...f, systemElectronic: [...f.systemElectronic, { type: "master", amount: "" }] }));
  const removeSystemElec = (idx) => setForm(f => ({ ...f, systemElectronic: f.systemElectronic.filter((_, i) => i !== idx) }));
  const updateSystemElec = (idx, k, v) => setForm(f => {
    const next = [...f.systemElectronic];
    next[idx][k] = (k === "amount") ? fmtNum(parseNum(v)) : v;
    return { ...f, systemElectronic: next };
  });

  const addActualElec = () => setForm(f => ({ ...f, actualElectronic: [...f.actualElectronic, { type: "master", amount: "" }] }));
  const removeActualElec = (idx) => setForm(f => ({ ...f, actualElectronic: f.actualElectronic.filter((_, i) => i !== idx) }));
  const updateActualElec = (idx, k, v) => setForm(f => {
    const next = [...f.actualElectronic];
    next[idx][k] = (k === "amount") ? fmtNum(parseNum(v)) : v;
    return { ...f, actualElectronic: next };
  });

  // Computed Values for the Form
  // Currency rate from context or form
  const entryCurrency = currencies.find(c => c.code === form.currencyCode) || currencies[0];
  const toBase = (val) => parseNum(val) / entryCurrency.rate;

  // Computed Values into IQD (Base)
  // Computed Values into IQD (Base)
  const cashActual = toBase(form.cashActual);
  const cashSystemBase = toBase(form.cashSystem);
  const returnsBase = toBase(form.returns);
  const netCashSystem = cashSystemBase - returnsBase;

  const totalElecSystem = form.systemElectronic.reduce((a, e) => a + toBase(e.amount), 0);
  const totalNetSystem = netCashSystem + totalElecSystem;

  const totalElecActual = form.actualElectronic.reduce((a, e) => a + toBase(e.amount), 0);
  const totalActual = cashActual + totalElecActual;

  const diffCash = cashActual - netCashSystem;
  const diffElec = totalElecActual - totalElecSystem;
  const diffTotal = totalActual - totalNetSystem;

  const openModal = () => {
    const freshNow = new Date();
    setForm({
      ...emptyForm,
      date: freshNow,
    });
    setBreakdown(initBreakdown());
    setAlert(null);
    setModalOpen(true);
  };

  const openEditModal = async (s) => {
    setLoading(true);
    setAlert(null);
    try {
      // First get the full sale details to ensure we have all data
      const saleRes = await api.get(`/sales/${s.id}`);
      const fullSaleData = saleRes.data?.data || s;
      
      const breakdownRes = await api.get(`/sales/${s.id}/cash-breakdown`);
      const bData = breakdownRes.data?.data || [];
      
      const nextBreakdown = denominations.map(d => {
        const match = bData.find(b => b.denomination === d);
        return { denomination: d, count: match ? match.count : 0 };
      });

      // Construct electronic arrays with ALL data, including zeros
      const sysElec = ELEC_CONFIG.map(c => ({
        type: c.key, 
        amount: fmtNum(fullSaleData[`${c.key}System`] || 0)
      })).filter(item => parseFloat(item.amount.replace(/,/g, '')) > 0);

      const actElec = ELEC_CONFIG.map(c => ({
        type: c.key, 
        amount: fmtNum(fullSaleData[`${c.key}Actual`] || 0)
      })).filter(item => parseFloat(item.amount.replace(/,/g, '')) > 0);

      // Ensure we have at least one entry for each electronic type
      const finalSysElec = sysElec.length ? sysElec : [{ type: "master", amount: fmtNum(fullSaleData.masterSystem || 0) }];
      const finalActElec = actElec.length ? actElec : [{ type: "master", amount: fmtNum(fullSaleData.masterActual || 0) }];

      console.log('Loading sale data:', {
        cashActual: fullSaleData.cashActual,
        cashSystem: fullSaleData.cashSystem,
        masterSystem: fullSaleData.masterSystem,
        masterActual: fullSaleData.masterActual,
        finalSysElec,
        finalActElec
      });

      setForm({
        id: fullSaleData.id,
        employeeId: fullSaleData.employeeId,
        cashierNumber: String(fullSaleData.cashierNumber),
        shift: fullSaleData.shift,
        date: new Date(fullSaleData.year, fullSaleData.month - 1, fullSaleData.dayNumber, 
          parseInt(fullSaleData.entryTime?.split(':')[0] || 0), 
          parseInt(fullSaleData.entryTime?.split(':')[1] || 0)),
        cashActual: fmtNum(fullSaleData.cashActual || 0),
        cashSystem: fmtNum(fullSaleData.cashSystem || 0),
        returns: fmtNum(fullSaleData.returns || 0),
        systemElectronic: finalSysElec,
        actualElectronic: finalActElec,
        currencyCode: "IQD",
        notes: fullSaleData.notes || "",
      });
      setBreakdown(nextBreakdown);
      setModalOpen(true);
    } catch (error) {
      console.error('Error loading sale data:', error);
      setAlert({ type: "danger", msg: "❌ فشل استعادة تفاصيل الشفت" });
    } finally { setLoading(false); }
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const dVal = form.date || new Date();
      const payload = {
        employeeId: form.employeeId,
        cashierNumber: parseInt(form.cashierNumber) || 1,
        shift: form.shift,
        dayNumber: dVal.getDate(),
        month: dVal.getMonth() + 1,
        year: dVal.getFullYear(),
        entryTime: dVal.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 
        cashSystem: cashSystemBase, 
        returns: returnsBase,
        cashActual: cashActual, // Add cashActual to payload
        notes: form.notes,
        cashBreakdown: breakdown.map(r => ({ denomination: r.denomination, count: r.count, subtotal: r.denomination * r.count })),
      };
      
      ELEC_CONFIG.forEach(c => {
        const sysEntries = form.systemElectronic.filter(e => e.type === c.key);
        const actEntries = form.actualElectronic.filter(e => e.type === c.key);
        payload[`${c.key}System`] = sysEntries.reduce((a, e) => a + toBase(e.amount), 0);
        payload[`${c.key}Actual`] = actEntries.reduce((a, e) => a + toBase(e.amount), 0);
      });

      console.log('Sending payload:', payload);

      if (form.id) {
        await api.put(`/sales/${form.id}`, payload);
        setAlert({ type: "success", msg: "✅ تم تحديث الشفت بنجاح" });
      } else {
        await api.post("/sales", payload);
        setAlert({ type: "success", msg: "✅ تم إدخال الشفت وترحيل المبالغ للقاصات بنجاح" });
      }
      closeModal();
      loadSales();
    } catch (err) {
      console.error('Submit error:', err);
      setAlert({ type:"danger", msg:"❌ " + (err.response?.data?.message || err.message || "فشل حفظ الشفت") });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/sales/${id}`);
      setAlert({ type:"success", msg:"✅ تم حذف الشفت وإعادة حساب القاصات" });
      setDeleteConfirm(null);
      loadSales();
    } catch (err) {
      setAlert({ type:"danger", msg:"❌ " + (err.response?.data?.message || "فشل الحذف") });
      setDeleteConfirm(null);
    }
  };

  const F = ({ label, k, hint }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="premium-input" type="text" inputMode="decimal"
        value={form[k]} onChange={e => setField(k, e.target.value)} placeholder="0" />
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">💰 إدخال وسجل المبيعات</div>
          <div className="page-subtitle">إدارة شفتات الكاشير وترحيل المبالغ اليومية</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openModal}>➕ إدخال شفت جديد</button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} mb-16`}>
          {alert.msg}
          <button className="alert-close" onClick={() => setAlert(null)}>✕</button>
        </div>
      )}

      {/* Filter */}
      <div className="filter-bar mb-16">
        <select className="form-control" value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ width:120 }}>
          {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <input className="form-control" type="text" inputMode="numeric" value={filterYear}
          onChange={e => setFilterYear(+e.target.value)} style={{ width:90 }} placeholder="السنة" />
        <button className="btn btn-ghost btn-sm" onClick={loadSales}>🔍 بحث</button>
      </div>

      {/* Table: Sales List */}
      <div className="table-wrapper">
        <div className="table-header">
          <span className="card-title">سجل الشفتات - {monthNames[filterMonth-1]} {filterYear}</span>
          <span className="badge badge-info">{sales.length} شفتات</span>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" /> جاري التحميل...</div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>اليوم</th>
                  <th>الكاشير</th>
                  <th>الشفت</th>
                  <th>صافي الإيراد (نظام)</th>
                  <th>الإيراد الفعلي</th>
                  <th>فارق الإجمالي</th>
                  <th>⚡</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><span className="icon">📋</span><p>لا يوجد مبيعات مسجلة لهذا الشهر</p></div>
                  </td></tr>
                ) : sales.map(s => (
                  <tr key={s.id}>
                    <td className="fw-bold">{s.dayNumber}/{s.month}/{s.year}</td>
                    <td>{s.employee?.name} <span className="badge badge-info">#{s.cashierNumber}</span></td>
                    <td>{SHIFT_LABELS[s.shift]}</td>
                    <td className="cell-blue">{fmt(s.totalNetSystem)}</td>
                    <td className="cell-green">{fmt(s.totalActual)}</td>
                    <td className="fw-bold">
                      {s.diffTotal == 0 ? <span className="cell-green">مطابق ✓</span> : 
                       s.diffTotal > 0 ? <span className="cell-green">+{fmtNum(s.diffTotal)}</span> :
                       <span className="cell-red">{fmtNum(s.diffTotal)}</span>}
                    </td>
                    <td>
                      <div style={{ display:"flex", gap:3 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditModal(s)} title="تعديل">📝</button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteConfirm(s)} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="🗑️ تأكيد الحذف"
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>نعم، احذف الشفت</button>
          </>
        }
      >
        <p style={{ fontSize:14 }}>هل أنت متأكد من حذف هذا الشفت؟</p>
        {deleteConfirm && (
          <div style={{ marginTop:12, padding:"10px 14px", background:"#fcfcfc", borderRadius:8, fontSize:13, border:"1px solid #e2e8f0" }}>
            <strong>كاشير رقم: {deleteConfirm.cashierNumber} ({deleteConfirm.employee?.name})</strong><br />
            التاريخ: {deleteConfirm.dayNumber}/{deleteConfirm.month}/{deleteConfirm.year} — {SHIFT_LABELS[deleteConfirm.shift]}<br/>
            الإجمالي الفعلي: <span className="cell-green">{fmt(deleteConfirm.totalActual)}</span>
          </div>
        )}
        <p style={{ marginTop:10, color:"var(--danger)", fontSize:12.5 }}>⚠️ سيتم طرح هذه المبالغ من أرصدة القاصات تلقائياً وإعادة حساب الإيرادات.</p>
      </Modal>

      {/* Sales Entry Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={form.id ? "📝 تعديل بيانات الشفت" : "➕ إدخال مبيعات شفت جديد"}
        size="xl"
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSubmit} disabled={saving} style={{ padding: "8px 20px", fontSize: 14 }}>
              {saving ? "⏳ جاري الحفظ..." : "✅ حفظ وترحيل المبالغ"}
            </button>
          </>
        }
      >
        <div className="premium-modal modal-vertical-layout" style={{ padding: "8px 14px 100px" }}>
          
          {/* بيانات عامة و اختيار العملة */}
          <div className="premium-section">
            <div className="premium-section-header" style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="icon-wrapper" style={{ width: 28, height: 28, fontSize: 14 }}>👤</div>
                <span style={{ fontWeight: 800, fontSize: 14 }}>بيانات الشفت الأساسية</span>
              </div>
            </div>
            <div className="premium-section-body" style={{ padding: '12px' }}>
              <div className="form-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1.2fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label required">الموظف (كاشير)</label>
                  <select className="premium-input" style={{ height: 32 }} value={form.employeeId}
                    onChange={e => handleEmployeeChange(e.target.value)}>
                    <option value="">-- اختر موظفاً --</option>
                    {employees.filter(e => e.employeeType === "cashier" && e.status === "active").map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">الشفت</label>
                  <select className="premium-input" style={{ height: 32 }} value={form.shift} onChange={e => setField("shift", e.target.value)}>
                    {SHIFT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الكاشير</label>
                  <input className="premium-input readonly-filled" style={{ height: 32, fontSize: 12 }} type="text" readOnly
                    value={form.cashierNumber ? `رقم ${form.cashierNumber}` : ""} placeholder="يملأ تلقائياً" />
                </div>
                <div className="form-group">
                  <label className="form-label required">التاريخ والوقت</label>
                  <div className="flex gap-2" style={{ direction: 'ltr' }}>
                     <div className="date-picker-wrapper" style={{ flex: 1.5, position: 'relative' }}>
                       <Calendar size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 5, color: '#94a3b8' }} />
                       <DatePicker
                         selected={form.date}
                         onChange={val => setField("date", val)}
                         dateFormat="yyyy/MM/dd"
                         className="premium-input"
                         style={{ paddingLeft: 28, height: 32, fontSize: 13, width: '100%' }}
                         containerClassName="dp-container"
                       />
                     </div>
                     <div className="time-picker-wrapper" style={{ flex: 1, position: 'relative' }}>
                       <Clock size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 5, color: '#94a3b8' }} />
                       <DatePicker
                         selected={form.date}
                         onChange={val => setField("date", val)}
                         showTimeSelect
                         showTimeSelectOnly
                         timeIntervals={5}
                         timeCaption="Time"
                         dateFormat="HH:mm"
                         className="premium-input"
                         style={{ paddingLeft: 28, height: 32, fontSize: 13, width: '100%' }}
                       />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 💵 و 💳 الجرد الفعلي (حاوية كاملة) */}
          <div className="premium-section">
            <div className="premium-section-header orange">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="icon-wrapper">💰</div>
                <span style={{ fontWeight: 800, fontSize: 13 }}>الجرد الفعلي في القاصة (كاش + إلكتروني)</span>
              </div>
              <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>عملة الجرد الفعلي:</span>
                <select className="premium-input" style={{ width: 80, height: 28, fontSize: 11, padding: '0 4px', border: '1px solid #cbd5e1' }}
                  value={form.currencyCode} onChange={e => setField("currencyCode", e.target.value)}>
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
            </div>
            <div className="premium-section-body">
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <label className="form-label">💸 إجمالي الكاش الفعلي (الدرج)</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCalc(true)} style={{ color: '#f59e0b', fontSize: 11, padding: 0 }}>
                       📟 استخدام الحاسبة
                    </button>
                  </div>
                  <input className="premium-input" type="text" inputMode="decimal"
                    value={form.cashActual} onChange={e => setField("cashActual", e.target.value)} 
                    placeholder="0" style={{ fontSize: 16, fontWeight: 800 }} />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <label className="form-label">💳 مبالغ الفيزا الفعلية (الدرج)</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addActualElec} style={{ color: 'var(--primary)', fontSize: 11, padding: 0 }}>
                      ➕ إضافة مبلغ
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {form.actualElectronic.map((entry, idx) => (
                      <div key={idx} className="flex gap-4">
                        <select className="premium-input" style={{ width: 90, height: 32, padding: "0 6px", fontSize: 11 }}
                          value={entry.type} onChange={e => updateActualElec(idx, "type", e.target.value)}>
                          {ELEC_CONFIG.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                        <input className="premium-input" style={{ flex: 1, height: 32 }} type="text" inputMode="decimal" placeholder="المبلغ الفعلي"
                          value={entry.amount} onChange={e => updateActualElec(idx, "amount", e.target.value)} />
                        {form.actualElectronic.length > 1 && (
                           <button type="button" className="btn btn-icon" onClick={() => removeActualElec(idx)} style={{ color: 'var(--danger)', height: 32, width: 32 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-8" style={{ background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>مجموع الجرد الفعلي:</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#15803d" }} className="num">{fmtNum(cashActual + totalElecActual)} <small style={{fontSize: 12, fontWeight: 700}}>{form.currencyCode}</small></span>
              </div>
            </div>
          </div>

          {/* 🖥️ مبالغ النظام (حاوية واحدة مقسمة) */}
          <div className="premium-section">
             <div className="premium-section-header green">
                <div className="icon-wrapper">🖥️</div>
                مبيعات النظام (كاش + إلكتروني)
             </div>
             <div className="premium-section-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1.5fr', gap: 12, alignItems: 'start' }}>
                   <div className="form-group">
                      <label className="form-label">كاش المبيعات (نظام)</label>
                      <input className="premium-input" style={{ height: 32 }} value={form.cashSystem} onChange={e => setField("cashSystem", e.target.value)} placeholder="0" />
                   </div>
                   <div className="form-group">
                      <label className="form-label">المرتجعات (نظام)</label>
                      <input className="premium-input" style={{ height: 32 }} value={form.returns} onChange={e => setField("returns", e.target.value)} placeholder="0" />
                   </div>
                   <div className="form-group">
                      <div className="flex-between" style={{ marginBottom: 4 }}>
                        <label className="form-label">تفاصيل الفيزا (نظام)</label>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={addSystemElec} style={{ color: 'var(--primary)', fontSize: 11, padding: 0 }}>
                           ➕ إضافة مبلغ
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {form.systemElectronic.map((entry, idx) => (
                           <div key={idx} className="flex gap-4">
                              <select className="premium-input" style={{ width: 85, height: 32, padding: "0 4px", fontSize: 11 }}
                                value={entry.type} onChange={e => updateSystemElec(idx, "type", e.target.value)}>
                                {ELEC_CONFIG.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                              </select>
                              <input className="premium-input" style={{ flex: 1, height: 32 }} type="text" inputMode="decimal" placeholder="المبلغ"
                                value={entry.amount} onChange={e => updateSystemElec(idx, "amount", e.target.value)} />
                              {form.systemElectronic.length > 1 && (
                                <button type="button" className="btn btn-icon" onClick={() => removeSystemElec(idx)} style={{ color: 'var(--danger)', height: 32, width: 32 }}>✕</button>
                              )}
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
                <div className="mt-4 p-8 flex-between" style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                   <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>إجمالي المطلوب من النظام (صافي):</span>
                   <span style={{ fontSize: 15, fontWeight: 850, color: '#0f172a' }}>{fmtNum(toBase(totalNetSystem) * entryCurrency.rate)} <small style={{ fontWeight: 700 }}>{form.currencyCode}</small></span>
                </div>
             </div>
          </div>

          {/* ⚖️ الخلاصة النهائية */}
          <div className="premium-section">
            <div className="premium-section-header">
              <div className="icon-wrapper">⚖️</div>
              الخلاصة والفوارق النهائية (بعد تحويل العملات)
            </div>
            <div className="premium-section-body" style={{ padding: '10px' }}>
              <div className="compare-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <DiffBox label="فارق الكاش" val={diffCash} act={cashActual} sys={netCashSystem} />
                <DiffBox label="فارق الإلكتروني" val={diffElec} act={totalElecActual} sys={totalElecSystem} />
                <DiffBox label="الفارق الإجمالي" val={diffTotal} act={totalActual} sys={totalNetSystem} />
              </div>
            </div>
          </div>

          {/* 📝 الملاحظات الإضافية */}
          <div className="premium-section">
            <div className="premium-section-header">
              <div className="icon-wrapper">📝</div>
              ملاحظات وتفاصيل إضافية
            </div>
            <div className="premium-section-body">
              <textarea 
                className="premium-input" 
                rows={2} 
                style={{ resize: 'none' }}
                value={form.notes}
                onChange={e => setField("notes", e.target.value)} 
                placeholder="أضف أي تفاصيل أو ملاحظات عن الفوارق هنا..." 
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 📟 Calculator Modal */}
      <Modal 
        isOpen={showCalc} 
        onClose={() => setShowCalc(false)} 
        title="📟 حاسبة فئات العملات (دينار عراقي)" 
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCalc(false)}>إلغاء</button>
            <button className="btn btn-primary" onClick={() => {
              const total = breakdown.reduce((a, r) => a + r.denomination * r.count, 0);
              console.log('Calculator total:', total);
              setField("cashActual", total);
              setShowCalc(false);
            }}>✅ اعتماد المبلغ النهائي</button>
          </>
        }
      >
        <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <span style={{ fontSize: 11, color: '#64748b' }}>إجمالي الفئات:</span>
           <button className="btn btn-primary btn-sm" style={{ padding: '2px 10px', fontSize: 11 }}
             onClick={() => {
               const total = breakdown.reduce((a, r) => a + r.denomination * r.count, 0);
               console.log('Quick transfer total:', total);
               setField("cashActual", total);
               setShowCalc(false);
             }}>
             اعتماد المبلغ الكلي ونقله للحقل 📋
           </button>
        </div>
        <div className="denom-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {breakdown.map((row, idx) => (
            <div key={row.denomination} className="denom-card">
              <div className="flex-between mb-4">
                <span className="denom-val-badge">{row.denomination.toLocaleString("en-US")}</span>
                <span className="denom-subtotal-text" style={{margin:0}}>
                   <span>{(row.denomination * row.count).toLocaleString("en-US")}</span>
                </span>
              </div>
              <input className="num" type="text" inputMode="numeric" 
                value={row.count ? fmtNum(row.count) : ""} onChange={e => handleBreakdown(idx, e.target.value)} placeholder="0" />
            </div>
          ))}
        </div>
        <div className="mt-12 p-12 text-center" style={{ background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>إجمالي المبلغ المدقق:</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d' }}>
              {fmtNum(breakdown.reduce((a, r) => a + r.denomination * r.count, 0))} <small style={{fontSize:14, fontWeight:400}}>د.ع</small>
            </div>
        </div>
      </Modal>
    </div>
  );
}
