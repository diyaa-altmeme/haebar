import { useState, useEffect } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import { UserPlus, UserMinus, Shield, Mail, CheckCircle, XCircle } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const emptyForm = { name: "", email: "", password: "", role: "data_entry", isActive: true };
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.patch(`/users/${editId}`, form);
      } else {
        await api.post("/users", form);
      }
      setModalOpen(false);
      fetchUsers();
      setForm(emptyForm);
      setEditId(null);
    } catch (e) {
      alert("خطأ: " + (e.response?.data?.message || e.message));
    }
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive, password: "" });
    setEditId(u.id);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.message || "خطأ في الحذف");
    }
  };

  const roleMap = { admin: "مدير النظام", manager: "مدير", data_entry: "مدخل بيانات" };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ marginBottom: 25 }}>
        <div>
           <h1 className="page-title">👤 إدارة المستخدمين</h1>
           <p className="page-subtitle">إضافة وتعديل صلاحيات الوصول للنظام المالي</p>
        </div>
        <button className="premium-btn primary" onClick={() => { setForm(emptyForm); setEditId(null); setModalOpen(true); }}>
          <UserPlus size={18} /> إضافة مستخدم جديد
        </button>
      </div>

      <div className="premium-section">
        <div className="table-scroll">
          <table className="premium-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الصلاحية</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>الخيارات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</td></tr>
              ) : users.length === 0 ? (
                 <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>لا يوجد مستخدمون حالياً</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar-small" style={{ background: u.role === 'admin' ? '#3b82f6' : '#94a3b8' }}>{u.name[0]}</div>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {roleMap[u.role]}
                    </span>
                  </td>
                  <td>
                    {u.isActive ? (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
                        <CheckCircle size={14} /> نشط
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
                        <XCircle size={14} /> معطل
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {new Date(u.createdAt).toLocaleDateString('ar-IQ')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                       <button className="action-btn edit" onClick={() => openEdit(u)}>تعديل</button>
                       <button className="action-btn delete" onClick={() => setDeleteConfirm(u)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal title={editId ? "📝 تعديل مستخدم" : "👤 إضافة مستخدم جديد"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="premium-form">
            <div className="form-grid">
              <div className="form-group">
                <label>الاسم الكامل</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>كلمة المرور {editId && "(اتركها فارغة لعدم التغيير)"}</label>
                <input required={!editId} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="form-group">
                <label>صلاحية الوصول</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="admin">مدير النظام (كامل الصلاحيات)</option>
                  <option value="manager">مدير (عرض وتقارير)</option>
                  <option value="data_entry">مدخل بيانات</option>
                </select>
              </div>
              <div className="form-group full-width">
               <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                  <span>حساب نشط (يمكنه تسجيل الدخول)</span>
               </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="premium-btn secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
              <button type="submit" className="premium-btn primary">حفظ البيانات</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="⚠️ تأكيد الحذف" onClose={() => setDeleteConfirm(null)}>
          <div style={{ padding: '10px 0' }}>
            <p>هل أنت متأكد من رغبتك في حذف المستخدم <strong>{deleteConfirm.name}</strong>؟</p>
            <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>هذا الإجراء لا يمكن التراجع عنه.</p>
          </div>
          <div className="form-actions">
            <button className="premium-btn secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            <button className="premium-btn danger" onClick={handleDelete}>تأكيد الحذف النهائي</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
