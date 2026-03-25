import { useState, useEffect } from "react";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import Modal from "../components/Modal";

const now = new Date();

const BOX_OPTIONS = [
  { value: "cash", label: "💵 كاش" },
  { value: "master", label: "💳 ماستر" },
  { value: "swish", label: "💱 سويج" },
  { value: "sagi", label: "🔷 الساقي" },
  { value: "other_elec", label: "💳 فيزا أخرى" },
  { value: "bank", label: "🏦 البنك" },
];

const parseNum = (s) => parseFloat(String(s).replace(/,/g, "") || "0") || 0;

export default function TransfersPage() {
  const { fmt } = useCurrency();
  const [transfers, setTransfers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);

  const emptyForm = {
    fromBox: "cash", toBox: "bank", amount: "",
    transferDate: now.toISOString().slice(0, 10),
    month: now.getMonth() + 1, year: now.getFullYear(),
    reason: "", authorizedBy: "",
  };
  const [form, setForm] = useState(emptyForm);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get("/employees").then(r => setEmployees(r.data?.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transfers", { params: { month: filterMonth, year: filterYear } });
      setTransfers(res.data?.data || []);
    } catch { setTransfers([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filterMonth, filterYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.fromBox === form.toBox) {
      setAlert({ type: "danger", msg: "❌ لا يمكن التحويل من وإلى نفس القاصة" });
      return;
    }
    setSaving(true);
    setAlert(null);
    try {
      await api.post("/transfers", {
        ...form,
        amount: parseNum(form.amount),
        month: +form.month, year: +form.year,
        authorizedBy: form.authorizedBy || undefined,
      });
      setAlert({ type: "success", msg: "✅ تم تسجيل التحويل وتحديث القاصتين" });
      setForm(emptyForm);
      setModalOpen(false);
      load();
    } catch (err) {
      setAlert({ type: "danger", msg: "❌ " + (err.response?.data?.message || "فشل التحويل") });
    } finally { setSaving(false); }
  };

  const handleConfirm = async (id) => {
    try {
      await api.put(`/transfers/${id}/confirm`);
      setAlert({ type: "success", msg: "✅ تم تأكيد التحويل" });
      load();
    } catch (err) {
      setAlert({ type: "danger", msg: err.response?.data?.message || "فشل التأكيد" });
    }
  };

  const total = transfers.reduce((a, t) => a + +t.amount, 0);
  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔄 التحويلات بين القاصات</div>
          <div className="page-subtitle">تسجيل ومتابعة التحويلات المالية</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setModalOpen(true); }}>
            ➕ تحويل جديد
          </button>
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
          onChange={e => setFilterYear(+e.target.value)} style={{ width:90 }} />
        <button className="btn btn-ghost btn-sm" onClick={load}>🔍 بحث</button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="table-header">
          <span className="card-title">سجل التحويلات — {monthNames[filterMonth-1]} {filterYear}</span>
          {transfers.length > 0 && <span className="badge badge-info">{fmt(total)}</span>}
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>من</th>
                  <th>إلى</th>
                  <th>المبلغ</th>
                  <th>السبب</th>
                  <th>الحالة</th>
                  <th>⚡</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><span className="icon">🔄</span><p>لا توجد تحويلات</p></div>
                  </td></tr>
                ) : transfers.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.transferDate).toLocaleDateString("en-GB")}</td>
                    <td>{BOX_OPTIONS.find(b => b.value === t.fromBox)?.label || t.fromBox}</td>
                    <td>{BOX_OPTIONS.find(b => b.value === t.toBox)?.label || t.toBox}</td>
                    <td className="cell-blue fw-bold">{fmt(t.amount)}</td>
                    <td>{t.reason || "—"}</td>
                    <td>
                      <span className={`badge ${t.isConfirmed ? "badge-success" : "badge-warning"}`}>
                        {t.isConfirmed ? "✅ مؤكد" : "⏳ انتظار"}
                      </span>
                    </td>
                    <td>
                      {!t.isConfirmed && (
                        <button className="btn btn-success btn-sm" onClick={() => handleConfirm(t.id)}>تأكيد ✓</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {transfers.length > 0 && (
                <tfoot>
                  <tr className="table-total-row">
                    <td colSpan={3}>الإجمالي</td>
                    <td className="cell-blue fw-black">{fmt(total)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="🔄 تحويل جديد بين القاصات"
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>إلغاء</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "⏳ جاري التسجيل..." : "🔄 تسجيل التحويل"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns:"1fr auto 1fr", alignItems:"end", gap:12 }}>
            <div className="form-group">
              <label className="form-label required">من قاصة</label>
              <select className="form-control" value={form.fromBox} onChange={e => setField("fromBox", e.target.value)}>
                {BOX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ textAlign:"center", fontSize:22, paddingBottom:6, color:"var(--primary-light)" }}>⬅️</div>
            <div className="form-group">
              <label className="form-label required">إلى قاصة</label>
              <select className="form-control" value={form.toBox} onChange={e => setField("toBox", e.target.value)}>
                {BOX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid form-grid-2" style={{ marginTop:12 }}>
            <div className="form-group">
              <label className="form-label required">المبلغ</label>
              <input className="form-control" type="text" inputMode="decimal"
                value={form.amount} onChange={e => setField("amount", e.target.value)}
                required placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label required">تاريخ التحويل</label>
              <input className="form-control" type="date"
                value={form.transferDate}
                onChange={e => {
                  const d = new Date(e.target.value);
                  setForm(f => ({ ...f, transferDate: e.target.value, month: d.getMonth()+1, year: d.getFullYear() }));
                }} required />
            </div>
            <div className="form-group">
              <label className="form-label">الموظف المُخوِّل</label>
              <select className="form-control" value={form.authorizedBy} onChange={e => setField("authorizedBy", e.target.value)}>
                <option value="">-- اختياري --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">سبب التحويل</label>
              <input className="form-control" type="text" value={form.reason}
                onChange={e => setField("reason", e.target.value)} placeholder="اختياري..." />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
