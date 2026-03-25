import { useState, useEffect } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

const now = new Date();
const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function SettingsPage() {
  const [categories, setCategories] = useState([]);
  const [monthSetting, setMonthSetting] = useState(null);
  const [alert, setAlert] = useState(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [editCatId, setEditCatId] = useState(null);
  const [savingCat, setSavingCat] = useState(false);
  const [savingMonth, setSavingMonth] = useState(false);

  const emptyCat = { name: "", isCompanySettlement: false };
  const [catForm, setCatForm] = useState(emptyCat);

  const [monthForm, setMonthForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();

  useEffect(() => { loadCategories(); loadMonth(); }, []);

  const loadCategories = async () => {
    try { const r = await api.get("/settings/expense-categories"); setCategories(r.data?.data || []); } catch { }
  };

  const loadMonth = async () => {
    try { const r = await api.get("/settings/month"); setMonthSetting(r.data?.data || null); } catch { }
  };

  const openCatModal = (cat = null) => {
    if (cat) { setEditCatId(cat.id); setCatForm({ name: cat.name, isCompanySettlement: cat.isCompanySettlement }); }
    else { setEditCatId(null); setCatForm(emptyCat); }
    setCatModalOpen(true);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setSavingCat(true);
    try {
      if (editCatId) await api.put(`/settings/expense-categories/${editCatId}`, catForm);
      else await api.post("/settings/expense-categories", catForm);
      setAlert({ type:"success", msg: editCatId ? "✅ تم تعديل التبويب" : "✅ تم إضافة التبويب" });
      setCatModalOpen(false);
      setEditCatId(null);
      setCatForm(emptyCat);
      loadCategories();
    } catch (err) {
      setAlert({ type:"danger", msg:"❌ " + (err.response?.data?.message || "فشل الحفظ") });
    } finally { setSavingCat(false); }
  };

  const handleMonthSubmit = async (e) => {
    e.preventDefault();
    setSavingMonth(true);
    try {
      await api.put("/settings/month", {
        month: +monthForm.month, year: +monthForm.year,
        daysInMonth: new Date(+monthForm.year, +monthForm.month, 0).getDate(),
        isActive: true, createdBy: user?.id,
      });
      setAlert({ type:"success", msg:"✅ تم تعيين الشهر النشط" });
      setMonthModalOpen(false);
      loadMonth();
    } catch (err) {
      setAlert({ type:"danger", msg:"❌ " + (err.response?.data?.message || "فشل التحديث") });
    } finally { setSavingMonth(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ الإعدادات</div>
          <div className="page-subtitle">إدارة التبويبات، الشهر النشط، والنظام</div>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.msg}
          <button className="alert-close" onClick={() => setAlert(null)}>✕</button>
        </div>
      )}

      <div className="two-col">
        {/* Categories */}
        <div>
          <div className="table-wrapper">
            <div className="table-header">
              <span className="card-title">📂 تبويبات المصروفات</span>
              <button className="btn btn-primary btn-sm" onClick={() => openCatModal()}>➕ إضافة</button>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>#</th><th>الاسم</th><th>النوع</th><th>الحالة</th><th>⚡</th></tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr><td colSpan={5}><div className="empty-state"><span className="icon">📂</span><p>لا توجد تبويبات</p></div></td></tr>
                  ) : categories.map((c, i) => (
                    <tr key={c.id}>
                      <td>{i+1}</td>
                      <td className="fw-bold">{c.name}</td>
                      <td><span className={`badge ${c.isCompanySettlement?"badge-purple":"badge-info"}`}>{c.isCompanySettlement?"تسديد شركة":"صرف داخلي"}</span></td>
                      <td><span className={`badge ${c.isActive?"badge-success":"badge-danger"}`}>{c.isActive?"نشط":"معطل"}</span></td>
                      <td><button className="btn btn-outline btn-sm btn-icon" onClick={() => openCatModal(c)}>✏️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Month + Info */}
        <div>
          {/* Active Month Card */}
          <div className="card mb-16">
            <div className="card-header">
              <div className="card-title">📅 الشهر النشط</div>
              <button className="btn btn-primary btn-sm" onClick={() => {
                if (monthSetting) setMonthForm({ month: monthSetting.month, year: monthSetting.year });
                setMonthModalOpen(true);
              }}>⚙️ تغيير</button>
            </div>
            {monthSetting ? (
              <div>
                <div className="box-row">
                  <span className="box-row-label">الشهر النشط</span>
                  <span className="box-row-value fw-black" style={{ color:"var(--primary)", fontSize:16 }}>
                    {monthNames[(monthSetting.month||1)-1]} {monthSetting.year}
                  </span>
                </div>
                <div className="box-row">
                  <span className="box-row-label">عدد الأيام</span>
                  <span className="box-row-value">{monthSetting.daysInMonth} يوم</span>
                </div>
                <div className="box-row">
                  <span className="box-row-label">الحالة</span>
                  <span className="badge badge-success">نشط ✓</span>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding:20 }}>
                <p>لم يُعيَّن شهر نشط بعد</p>
              </div>
            )}
          </div>

          {/* System Info Card */}
          <div className="card">
            <div className="card-header"><div className="card-title">ℹ️ معلومات النظام</div></div>
            <div style={{ fontSize:13 }}>
              {[
                ["اسم النظام", "هايبر ماركت العائلة السعيدة"],
                ["الإصدار", "v1.0 — مارس 2026"],
                ["العملة الأساسية", "الدينار العراقي (د.ع)"],
                ["عدد القاصات", "6 قاصات"],
                ["الشفتات اليومية", "3 شفتات"],
                ["المطور المفوّض", "نظام إدارة مالية متكامل"],
              ].map(([label, val]) => (
                <div key={label} className="box-row">
                  <span className="box-row-label">{label}</span>
                  <span className="box-row-value">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editCatId ? "✏️ تعديل تبويب" : "➕ إضافة تبويب مصروفات"}
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCatModalOpen(false)} disabled={savingCat}>إلغاء</button>
            <button className="btn btn-success" onClick={handleCatSubmit} disabled={savingCat}>
              {savingCat ? "⏳..." : editCatId ? "💾 حفظ" : "➕ إضافة"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCatSubmit}>
          <div className="form-group mb-16">
            <label className="form-label required">اسم التبويب</label>
            <input className="form-control" type="text"
              value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              required placeholder="مثال: تسديد شركة..." />
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:13.5, padding:"10px 0" }}>
            <input type="checkbox" checked={catForm.isCompanySettlement}
              onChange={e => setCatForm(f => ({ ...f, isCompanySettlement: e.target.checked }))}
              style={{ width:16, height:16, accentColor:"var(--purple)" }} />
            <span>
              تبويب "تسديد شركة"
              <span className="form-hint" style={{ display:"block" }}>يؤثر على معادلات الصافي في التقارير</span>
            </span>
          </label>
        </form>
      </Modal>

      {/* Month Modal */}
      <Modal
        isOpen={monthModalOpen}
        onClose={() => setMonthModalOpen(false)}
        title="📅 تعيين الشهر النشط"
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setMonthModalOpen(false)} disabled={savingMonth}>إلغاء</button>
            <button className="btn btn-success" onClick={handleMonthSubmit} disabled={savingMonth}>
              {savingMonth ? "⏳..." : "✅ تعيين كشهر نشط"}
            </button>
          </>
        }
      >
        <form onSubmit={handleMonthSubmit}>
          <div className="form-group mb-16">
            <label className="form-label required">الشهر</label>
            <select className="form-control" value={monthForm.month}
              onChange={e => setMonthForm(f => ({ ...f, month: +e.target.value }))}>
              {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">السنة</label>
            <input className="form-control" type="text" inputMode="numeric"
              value={monthForm.year} onChange={e => setMonthForm(f => ({ ...f, year: e.target.value }))} required />
            <span className="form-hint">سيتم احتساب عدد أيام الشهر تلقائياً</span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
