import Link from "next/link";
import { LayoutDashboard, Receipt, Wallet, Banknote, ArrowRightLeft, FileText, Users, Settings, LogOut } from "lucide-react";

export function Sidebar() {
  const navItems = [
    { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
    { name: "إدارة المبيعات", href: "/sales", icon: Receipt },
    { name: "إدارة المصروفات", href: "/expenses", icon: Wallet },
    { name: "القاصات والأرصدة", href: "/boxes", icon: Banknote },
    { name: "التحويلات", href: "/transfers", icon: ArrowRightLeft },
    { name: "التقارير", href: "/reports", icon: FileText },
    { name: "الموظفين", href: "/employees", icon: Users },
    { name: "الإعدادات", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white leading-tight">هايبر ماركت<br/>العائلة السعيدة</h1>
        <p className="text-xs text-slate-500 mt-1">النظام المالي المتكامل</p>
      </div>
      
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href as any}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-red-900/30 text-red-400 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
