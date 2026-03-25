import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      const { accessToken, refreshToken, user } = res.data.data;
      login(user, accessToken, refreshToken);
    } catch (err) {
      setError(err.response?.data?.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="icon">🏪</div>
          <h1>هايبر ماركت العائلة السعيدة</h1>
          <p>نظام الإدارة المالية</p>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input
              className="form-control"
              type="email"
              placeholder="admin@haebar.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">كلمة المرور</label>
            <input
              className="form-control"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? "جاري تسجيل الدخول..." : "🔑 تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
