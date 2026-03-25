"use client";

import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "data_entry";
};

const roleLabels = {
  admin: "مدير النظام",
  manager: "مدير",
  data_entry: "مدخل بيانات"
} as const;

export function SessionSummary() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: { user: SessionUser } }) => {
        setUser(payload.data?.user ?? null);
      })
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    window.location.href = "/login";
  };

  if (!user) {
    return null;
  }

  return (
    <div className="surface flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <p className="text-xs text-slate">
            {roleLabels[user.role]} - {user.email}
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={logout}>
        <LogOut className="ml-2 h-4 w-4" />
        تسجيل الخروج
      </Button>
    </div>
  );
}
