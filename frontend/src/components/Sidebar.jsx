import { NavLink } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import { 
  Home, TrendingUp, DollarSign, ArrowRightLeft, Wallet, PieChart, Users, Settings, LogOut, Database, FileText, ShieldCheck
} from "lucide-react";

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
  const { currency, currencies, changeCurrency } = useCurrency();
  const firstLetter = user?.name?.[0] || "م";
  const roleMap = { admin: "مدير النظام", manager: "مدير عام", data_entry: "مدخل بيانات" };

  const navigationSections = [
    {
      title: "نظرة عامة",
      links: [
        { to: "/", icon: Home, label: "لوحة القيادة الذكية", end: true },
        { to: "/reports", icon: PieChart, label: "التقارير الشاملة والتحليل" }
      ]
    },
    {
      title: "العمليات المالية",
      links: [
        { to: "/sales", icon: DollarSign, label: "إدخال المبيعات اليومية" },
        { to: "/expenses", icon: FileText, label: "سجلات المصروفات" },
        { to: "/transfers", icon: ArrowRightLeft, label: "التحويلات الداخلية" }
      ]
    },
    {
      title: "الموارد",
      links: [
        { to: "/boxes", icon: Database, label: "إدارة القاصات والأرصدة" },
      ]
    },
    {
      title: "إدارة النظام",
      links: [
        { to: "/employees", icon: Users, label: "إدارة الموظفين" },
        { to: "/users", icon: ShieldCheck, label: "إدارة المستخدمين والصلاحيات" },
        { to: "/settings", icon: Settings, label: "إعدادات النظام" },
      ]
    }
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">🏪</div>
        <h2>هايبر ماركت السعادة</h2>
        <p>نظام الإدارة المالية ⚡</p>
      </div>

      <div className="sidebar-currency">
        <label>العملة الافتراضية</label>
        <select 
          value={currency.code} 
          onChange={e => changeCurrency(e.target.value)}
        >
          {currencies.map(c => (
            <option key={c.code} value={c.code}>{c.symbol} - {c.name}</option>
          ))}
        </select>
      </div>

      <nav className="sidebar-nav">
        {navigationSections.map((section, idx) => {
          const visibleLinks = section.links.filter(link => {
            if (link.to === "/users" || link.to === "/employees" || link.to === "/settings") return user?.role === "admin";
            return true;
          });
          
          if (visibleLinks.length === 0) return null;

          return (
            <div key={idx} style={{ marginBottom: '14px' }}>
              <div className="nav-section-title">
                {section.title}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {visibleLinks.map(({ to, icon: LinkIcon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  >
                    <div className="nav-icon">
                      <LinkIcon size={16} />
                    </div>
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{firstLetter}</div>
          <div>
            <div className="user-name">{user?.name || "المستخدم الحالي"}</div>
            <div className="user-role">{roleMap[user?.role] || user?.role}</div>
          </div>
        </div>
        
        <button onClick={onLogout} className="btn-logout">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <LogOut size={14} />
            إنهاء الجلسة 
          </div>
        </button>
      </div>
    </aside>
  );
}
