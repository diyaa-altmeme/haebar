"use client";

import { useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [email, setEmail] = useState("admin@haebar.local");
  const [password, setPassword] = useState("Admin12345!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setLoading(false);
      setError(payload.error ?? "تعذر تسجيل الدخول.");
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 lg:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface overflow-hidden bg-[linear-gradient(160deg,rgba(16,24,40,1),rgba(45,90,70,0.96))] p-8 text-white lg:p-12">
          <p className="text-xs uppercase tracking-[0.32em] text-white/60">Haebar Finance OS</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight lg:text-6xl">
            نظام مالي احترافي بدقة محاسبية كاملة وتصميم عربي حديث.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-8 text-white/75 lg:text-base">
            هذه النسخة تعمل بالكامل على Next.js App Router و TypeScript مع Prisma و PostgreSQL، وكل الحسابات المالية
            تنفذ حصراً في الخادم.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              "NUMERIC(18,3)",
              "Audit Log",
              "Recalculation Engine"
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="self-center">
          <CardHeader>
            <CardTitle>تسجيل الدخول</CardTitle>
            <CardDescription>استخدم حساب المدير الافتراضي أو أي مستخدم تم إنشاؤه من لوحة المستخدمين.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={submit}>
              <div>
                <label className="field-label">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
                  <Input className="pr-11" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              </div>

              <div>
                <label className="field-label">كلمة المرور</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
                  <Input className="pr-11" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
              </div>

              {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                دخول إلى النظام
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
