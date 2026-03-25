import { useState, useEffect } from "react";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import Modal from "../components/Modal";

const SHIFT_MAP = { morning:"☀️ صباحي", evening:"🌤 مسائي", night:"🌙 ليلي" };
const TYPE_MAP = { cashier:"كاشير", accounting:"محاسب", treasury:"صندوق", manager:"مدير" };
const TYPE_BADGE = { cashier:"badge-info", accounting:"badge-teal", treasury:"badge-purple", manager:"badge-warning" };
const STATUS_MAP = { active:{label:"نشط",badge:"badge-success"}, leave:{label:"إجازة",badge:"badge-warning"}, suspended:{label:"موقوف",badge:"badge-danger"} };

export default function EmployeesPage() {
  const { fmt } = useCurrency();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const emptyForm = {
    name:"", cashierNumber:"1", shift:"morning",
    employeeType:"cashier", phone:"", salary:"0", status:"active"
  };
  const [form, setForm] = useState(emptyForm);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees");
      setEmployees(res.data?.data || []);
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openModal = (emp = null) => {
    if (emp) {
      setEditId(emp.id);
      setForm({
        name: emp.name, cashierNumber: String(emp.cashierNumber),
        shift: emp.shift, employeeType: emp.employeeType,
        phone: emp.phone || "", salary: String(emp.salary || "0"), status: emp.status
      });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        cashierNumber: parseInt(form.cashierNumber) || 1,
        salary: parseFloat(String(form.salary).replace(/,/g,"")) || 0,
      };
      if (editId) await api.put(`/employees/${editId}`, payload);
      else await api.post("/employees", payload);
      setAlert({ type:"success", msg: editId ? "✅ تم تعديل بيانات الموظف" : "✅ تم إضافة الموظف" });
      closeModal();
      load();
    } catch (err) {
      setAlert({ type:"danger", msg:"❌ " + (err.response?.data?.message || "فشل الحفظ") });
    } finally { setSaving(false); }
  };

  const cashiers = employees.filter(e => e.employeeType === "cashier");
  const others = employees.filter(e => e.employeeType !== "cashier");

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👥 الموظفون</div>
          <div className="page-subtitle">إدارة الكاشيرات وموظفي الحسابات والصندوق</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => openModal()}>➕ موظف جديد</button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.msg}
          <button className="alert-close" onClick={() => setAlert(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /> جاري التحميل...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="kpi-grid mb-20" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))" }}>
            <div className="kpi-card blue">
              <div className="kpi-icon">👥</div>
              <div className="kpi-label">إجمالي الموظفين</div>
              <div className="kpi-value neutral">{employees.length}</div>
            </div>
            <div className="kpi-card green">
              <div className="kpi-icon">✅</div>
              <div className="kpi-label">موظف نشط</div>
              <div className="kpi-value positive">{employees.filter(e=>e.status==="active").length}</div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-icon">💰</div>
              <div className="kpi-label">كاشيرات</div>
              <div className="kpi-value neutral">{cashiers.length}</div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-icon">🏢</div>
              <div className="kpi-label">إداريون</div>
              <div className="kpi-value neutral">{others.length}</div>
            </div>
          </div>

          {/* Cashiers Table */}
          <div className="table-wrapper mb-20">
            <div className="table-header">
              <span className="card-title">💰 الكاشيرات ({cashiers.length})</span>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th><th>الاسم</th><th>رقم الكاشير</th><th>الشفت</th><th>الراتب</th><th>الحالة</th><th>⚡</th>
                  </tr>
                </thead>
                <tbody>
                  {cashiers.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><span className="icon">💰</span><p>لا يوجد كاشيرات</p></div></td></tr>
                  ) : cashiers.map((e, i) => (
                    <tr key={e.id}>
                      <td>{i+1}</td>
                      <td className="fw-bold">{e.name}</td>
                      <td><span className="badge badge-info">#{e.cashierNumber}</span></td>
                      <td>{SHIFT_MAP[e.shift]}</td>
                      <td className="cell-blue">{fmt(e.salary||0)}</td>
                      <td><span className={`badge ${STATUS_MAP[e.status]?.badge}`}>{STATUS_MAP[e.status]?.label}</span></td>
                      <td><button className="btn btn-outline btn-sm btn-icon" onClick={() => openModal(e)}>✏️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Other Staff */}
          <div className="table-wrapper">
            <div className="table-header">
              <span className="card-title">🏢 الإداريون والحسابات ({others.length})</span>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th><th>الاسم</th><th>النوع</th><th>الشفت</th><th>الراتب</th><th>الحالة</th><th>⚡</th>
                  </tr>
                </thead>
                <tbody>
                  {others.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><span className="icon">🏢</span><p>لا يوجد موظفون إداريون</p></div></td></tr>
                  ) : others.map((e, i) => (
                    <tr key={e.id}>
                      <td>{i+1}</td>
                      <td className="fw-bold">{e.name}</td>
                      <td><span className={`badge ${TYPE_BADGE[e.employeeType]}`}>{TYPE_MAP[e.employeeType]}</span></td>
                      <td>{SHIFT_MAP[e.shift]}</td>
                      <td className="cell-blue">{fmt(e.salary||0)}</td>
                      <td><span className={`badge ${STATUS_MAP[e.status]?.badge}`}>{STATUS_MAP[e.status]?.label}</span></td>
                      <td><button className="btn btn-outline btn-sm btn-icon" onClick={() => openModal(e)}>✏️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editId ? "✏️ تعديل بيانات موظف" : "➕ إضافة موظف جديد"}
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSubmit} disabled={saving}>
              {saving ? "⏳ جاري الحفظ..." : editId ? "💾 حفظ التعديلات" : "➕ إضافة"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label required">الاسم الكامل</label>
              <input className="form-control" type="text"
                value={form.name} onChange={e => setField("name", e.target.value)}
                required placeholder="الاسم الثلاثي" />
            </div>
            <div className="form-group">
              <label className="form-label required">نوع الموظف</label>
              <select className="form-control" value={form.employeeType} onChange={e => setField("employeeType", e.target.value)}>
                <option value="cashier">💰 كاشير</option>
                <option value="accounting">📊 محاسب</option>
                <option value="treasury">🏦 صندوق</option>
                <option value="manager">🏢 مدير</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">رقم الكاشير</label>
              <input className="form-control" type="text" inputMode="numeric"
                value={form.cashierNumber} onChange={e => setField("cashierNumber", e.target.value)}
                required placeholder="1-10" />
            </div>
            <div className="form-group">
              <label className="form-label required">الشفت</label>
              <select className="form-control" value={form.shift} onChange={e => setField("shift", e.target.value)}>
                <option value="morning">☀️ صباحي</option>
                <option value="evening">🌤 مسائي</option>
                <option value="night">🌙 ليلي</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">رقم الهاتف</label>
              <input className="form-control" type="text" inputMode="tel"
                value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="07xxxxxxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">الراتب</label>
              <input className="form-control" type="text" inputMode="decimal"
                value={form.salary} onChange={e => setField("salary", e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">الحالة</label>
              <select className="form-control" value={form.status} onChange={e => setField("status", e.target.value)}>
                <option value="active">✅ نشط</option>
                <option value="leave">⏸️ إجازة</option>
                <option value="suspended">🚫 موقوف</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
