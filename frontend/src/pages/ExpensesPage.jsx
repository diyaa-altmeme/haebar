import { useState, useEffect } from "react";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import DatePicker from "react-datepicker";
import { Calendar, Clock, Receipt, Wallet, Tag } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import Modal from "../components/Modal";

const now = new Date();
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");
const parseNum = (s) => parseFloat(String(s).replace(/,/g, "") || "0") || 0;
const BOX_OPTIONS = [
  { value: "cash", label: "💵 كاش" },
  { value: "master", label: "💳 ماستر" },
  { value: "swish", label: "💱 سويج" },
  { value: "sagi", label: "🔷 الساقي" },
  { value: "other_elec", label: "💳 فيزا أخرى" },
  { value: "bank", label: "🏦 البنك" },
];
const STATUS_OPTIONS = [
  { value: "paid", label: "✅ مسدد" },
  { value: "pending", label: "⏳ قيد التسديد" },
  { value: "late", label: "❌ متأخر" },
];
const METHOD_OPTIONS = [
  { value: "cash", label: "نقداً" },
  { value: "check", label: "شيك" },
  { value: "transfer", label: "تحويل بنكي" },
  { value: "card", label: "بطاقة" },
];
const STATUS_BADGE = { paid: "badge-success", pending: "badge-warning", late: "badge-danger" };
const STATUS_LABEL = { paid: "مسدد", pending: "قيد التسديد", late: "متأخر" };

export default function ExpensesPage() {
  const { fmt } = useCurrency();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const emptyForm = {
    date: now,
    category: "", subCategory: "", description: "", amount: "",
    paymentSource: "cash", paymentMethod: "cash", status: "paid", notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const setField = (k, v) => {
    let finalVal = v;
    if (k === "amount") finalVal = fmtNum(parseNum(v));
    setForm(f => ({ ...f, [k]: finalVal }));
  };

  useEffect(() => {
    api.get("/settings/expense-categories").then(r => setCategories(r.data?.data || [])).catch(() => {});
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/expenses", { params: { month: filterMonth, year: filterYear } });
      setExpenses(res.data?.data || []);
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { loadExpenses(); }, [filterMonth, filterYear]);

  const openModal = (ex = null) => {
    if (ex) {
      setEditId(ex.id);
      setForm({
        date: new Date(ex.year, ex.month - 1, ex.dayNumber),
        category: ex.category, subCategory: ex.subCategory || "",
        description: ex.description || "", amount: fmtNum(ex.amount),
        paymentSource: ex.paymentSource, paymentMethod: ex.paymentMethod,
        status: ex.status, notes: ex.notes || "",
      });
    } else {
      setEditId(null);
      setForm({ ...emptyForm, date: new Date() });
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const dVal = form.date || new Date();
      const payload = {
        ...form,
        amount: parseNum(form.amount),
        dayNumber: dVal.getDate(),
        month: dVal.getMonth() + 1,
        year: dVal.getFullYear(),
      };
      delete payload.date; // backend expects numeric fields
      if (editId) await api.put(`/expenses/${editId}`, payload);
      else await api.post("/expenses", payload);
      setAlert({ type: "success", msg: editId ? "✅ تم التعديل بنجاح" : "✅ تم الحفظ وتحديث القاصة" });
      closeModal();
      loadExpenses();
    } catch (err) {
      setAlert({ type: "danger", msg: "❌ " + (err.response?.data?.message || "فشل الحفظ") });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      setAlert({ type: "success", msg: "تم الحذف بنجاح" });
      setDeleteConfirm(null);
      loadExpenses();
    } catch (err) {
      setAlert({ type: "danger", msg: err.response?.data?.message || "فشل الحذف" });
      setDeleteConfirm(null);
    }
  };

  const total = expenses.reduce((a, e) => a + +e.amount, 0);

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📋 المصروفات</div>
          <div className="page-subtitle">إدخال وإدارة المصروفات اليومية</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => openModal()}>➕ إضافة مصروف</button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
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
        <button className="btn btn-ghost btn-sm" onClick={loadExpenses}>🔍 بحث</button>
      </div>

      {/* Table */}
      <div className="table-wrapper premium-section" style={{ overflow: 'visible' }}>
        <div className="premium-section-header">
           <div className="icon-wrapper">📋</div>
           سجل المصروفات - {monthNames[filterMonth-1]} {filterYear}
           <div style={{ marginRight: 'auto' }}>
             {expenses.length > 0 && <span className="badge badge-danger" style={{ fontSize: 13, fontWeight: 900 }}>{fmt(total)}</span>}
           </div>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" /> جاري التحميل...</div>
        ) : (
          <div className="table-scroll">
            <table className="table premium-table">
              <thead>
                <tr>
                  <th>اليوم</th>
                  <th>التبويب</th>
                  <th>الفرعي</th>
                  <th>البيان</th>
                  <th>المبلغ</th>
                  <th>القاصة</th>
                  <th>الحالة</th>
                  <th style={{ width: 60 }}>⚡</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><span className="icon">📋</span><p>لا توجد مصروفات لهذا الشهر</p></div>
                  </td></tr>
                ) : expenses.map(ex => (
                  <tr key={ex.id}>
                    <td className="fw-bold" style={{ fontSize: 12 }}>{ex.dayNumber}/{ex.month}</td>
                    <td style={{ fontSize: 13, fontWeight: 700 }}>{ex.category}</td>
                    <td>{ex.subCategory || "—"}</td>
                    <td style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", fontSize: 11 }}>{ex.description || "—"}</td>
                    <td className="cell-red" style={{ fontWeight: 800 }}>{fmt(ex.amount)}</td>
                    <td>{BOX_OPTIONS.find(b => b.value === ex.paymentSource)?.label.split(' ')[1] || ex.paymentSource}</td>
                    <td><span className={`badge ${STATUS_BADGE[ex.status]}`} style={{ fontSize: 10, padding: '2px 6px' }}>{STATUS_LABEL[ex.status]}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 3 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openModal(ex)} title="تعديل">📝</button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteConfirm(ex)} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editId ? "✏️ تعديل بيانات المصروف" : "➕ إضافة مصروف جديد للماركت"}
        size="xl"
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSubmit} disabled={saving} style={{ padding: '8px 25px' }}>
              <Receipt size={16} /> {saving ? "جاري الحفظ..." : editId ? "حفظ التعديلات" : "تأكيد إضافة المصروف"}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
           {/* Section 1: Basic & Date */}
           <div className="premium-section">
             <div className="premium-section-header green">
               <div className="icon-wrapper"><Calendar size={14}/></div>
               البيانات الأساسية والتاريخ
             </div>
             <div className="premium-section-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: 10 }}>
                   <div className="form-group">
                     <label className="form-label required">التاريخ</label>
                     <div className="date-picker-wrapper" style={{ position: 'relative' }}>
                       <Calendar size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 5, color: '#94a3b8' }} />
                       <DatePicker
                         selected={form.date}
                         onChange={val => setField("date", val)}
                         dateFormat="yyyy/MM/dd"
                         className="premium-input"
                       />
                     </div>
                   </div>
                   <div className="form-group">
                     <label className="form-label required">التبويب الرئيسي</label>
                     <select className="premium-input" style={{ height: 32 }} value={form.category} onChange={e => setField("category", e.target.value)} required>
                       <option value="">-- اختر تبويباً --</option>
                       {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                   </div>
                   <div className="form-group">
                     <label className="form-label">التبويب الفرعي</label>
                     <input className="premium-input" style={{ height: 32 }} type="text" value={form.subCategory}
                       onChange={e => setField("subCategory", e.target.value)} placeholder="اختياري..." />
                   </div>
                   <div className="form-group">
                      <label className="form-label required">المبلغ</label>
                      <input className="premium-input" style={{ height: 32, fontWeight: 900, color: 'var(--danger)', fontSize: 16 }} type="text" inputMode="decimal"
                        value={form.amount} onChange={e => setField("amount", e.target.value)} required placeholder="0" />
                   </div>
                </div>
             </div>
           </div>

           {/* Section 2: Payment & Info */}
           <div className="premium-section">
             <div className="premium-section-header purple">
               <div className="icon-wrapper"><Wallet size={14}/></div>
               تفاصيل الدفع والحالة
             </div>
             <div className="premium-section-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label required">مصدر الدفع</label>
                    <select className="premium-input" style={{ height: 32 }} value={form.paymentSource} onChange={e => setField("paymentSource", e.target.value)}>
                      {BOX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">طريقة الدفع</label>
                    <select className="premium-input" style={{ height: 32 }} value={form.paymentMethod} onChange={e => setField("paymentMethod", e.target.value)}>
                      {METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">الحالة</label>
                    <select className="premium-input" style={{ height: 32 }} value={form.status} onChange={e => setField("status", e.target.value)}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
             </div>
           </div>

           {/* Section 3: Notes */}
           <div className="premium-section">
             <div className="premium-section-header">
               <div className="icon-wrapper"><Tag size={14}/></div>
               البيان والتفاصيل
             </div>
             <div className="premium-section-body">
                <textarea className="premium-input" rows={2} style={{ resize: 'none' }} value={form.description}
                  onChange={e => setField("description", e.target.value)} placeholder="اكتب بياناً تفصيلياً لهذا المصروف (اسم الشخص، الشركة، الغرض)..." />
             </div>
           </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="🗑️ تأكيد الحذف"
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>نعم، احذف</button>
          </>
        }
      >
        <p style={{ fontSize:14 }}>هل أنت متأكد من حذف هذا المصروف؟</p>
        {deleteConfirm && (
          <div style={{ marginTop:12, padding:"10px 14px", background:"#f8fafc", borderRadius:8, fontSize:13 }}>
            <strong>{deleteConfirm.category}</strong> — <span className="cell-red">{fmt(deleteConfirm.amount)}</span>
            <br />اليوم: {deleteConfirm.dayNumber}/{deleteConfirm.month}/{deleteConfirm.year}
          </div>
        )}
        <p style={{ marginTop:10, color:"var(--danger)", fontSize:12.5 }}>⚠️ سيتم إعادة حساب رصيد القاصة بعد الحذف.</p>
      </Modal>
    </div>
  );
}
