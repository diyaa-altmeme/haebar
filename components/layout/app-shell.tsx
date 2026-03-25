"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, BarChart3, Boxes, BriefcaseBusiness, CircleDollarSign, LayoutDashboard, ReceiptText, Settings2, Users } from "lucide-react";

import { SessionSummary } from "@/components/layout/session-summary";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/" as const, label: "لوحة القيادة", icon: LayoutDashboard },
  { href: "/sales" as const, label: "المبيعات", icon: ReceiptText },
  { href: "/expenses" as const, label: "المصروفات", icon: CircleDollarSign },
  { href: "/transfers" as const, label: "التحويلات", icon: ArrowRightLeft },
  { href: "/boxes" as const, label: "القاصات", icon: Boxes },
  { href: "/employees" as const, label: "الموظفون", icon: BriefcaseBusiness },
  { href: "/users" as const, label: "المستخدمون", icon: Users },
  { href: "/reports" as const, label: "التقارير", icon: BarChart3 },
  { href: "/settings" as const, label: "الإعدادات", icon: Settings2 }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="page-wrap">
      <aside className="surface hidden w-[280px] shrink-0 flex-col justify-between p-5 lg:flex">
        <div className="space-y-8">
          <div className="rounded-[24px] bg-olive px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.28em] text-white/70">Haebar Finance</p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight">منصة تشغيل مالية دقيقة وجاهزة للتوسع</h1>
            <p className="mt-3 text-sm leading-7 text-white/80">
              Next.js App Router مع TypeScript وPrisma وحسابات محاسبية محصورة بالكامل في الخادم.
            </p>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                    active ? "bg-ink text-white" : "text-slate hover:bg-black/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="surface-muted px-4 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate">Financial Guardrails</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            <li>الحسابات ممنوعة في الواجهة الأمامية</li>
            <li>المعاملات المالية داخل Transactions</li>
            <li>Audit Log و Recalculation مفعّلان</li>
          </ul>
        </div>
      </aside>

      <div className="flex-1 space-y-6">
        <SessionSummary />
        {children}
      </div>
    </div>
  );
}
