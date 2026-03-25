"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Category = {
  id: string;
  name: string;
  isCompanySettlement: boolean;
  isActive: boolean;
  displayOrder: number;
};

type ActiveMonth = {
  id: string;
  month: number;
  year: number;
  daysInMonth: number;
  isActive: boolean;
};

const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function SettingsWorkspace() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeMonth, setActiveMonth] = useState<ActiveMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    id: "",
    name: "",
    isCompanySettlement: false,
    isActive: true,
    displayOrder: "0"
  });
  const [monthForm, setMonthForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear())
  });

  async function loadSettings() {
    setLoading(true);
    const [categoriesResponse, monthResponse] = await Promise.all([
      fetch("/api/settings/expense-categories", { cache: "no-store" }),
      fetch("/api/settings/month", { cache: "no-store" })
    ]);

    const categoriesPayload = (await categoriesResponse.json()) as { data?: Category[]; error?: string };
    const monthPayload = (await monthResponse.json()) as { data?: ActiveMonth | null; error?: string };

    if (!categoriesResponse.ok) {
      setError(categoriesPayload.error ?? "تعذر تحميل الإعدادات.");
      setLoading(false);
      return;
    }

    setCategories(categoriesPayload.data ?? []);
    setActiveMonth(monthPayload.data ?? null);
    if (monthPayload.data) {
      setMonthForm({
        month: String(monthPayload.data.month),
        year: String(monthPayload.data.year)
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function editCategory(category: Category) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      isCompanySettlement: category.isCompanySettlement,
      isActive: category.isActive,
      displayOrder: String(category.displayOrder)
    });
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(categoryForm.id ? `/api/settings/expense-categories/${categoryForm.id}` : "/api/settings/expense-categories", {
      method: categoryForm.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: categoryForm.name,
        isCompanySettlement: categoryForm.isCompanySettlement,
        isActive: categoryForm.isActive,
        displayOrder: Number(categoryForm.displayOrder)
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSaving(false);
      setError(payload.error ?? "تعذر حفظ التصنيف.");
      return;
    }

    setCategoryForm({ id: "", name: "", isCompanySettlement: false, isActive: true, displayOrder: "0" });
    await loadSettings();
    setSaving(false);
  }

  async function saveMonth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/settings/month", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: Number(monthForm.month),
        year: Number(monthForm.year)
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSaving(false);
      setError(payload.error ?? "تعذر تحديث الشهر النشط.");
      return;
    }

    await loadSettings();
    setSaving(false);
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>تصنيفات المصروفات</CardTitle>
            <CardDescription>إدارة التصنيفات المركزية التي تستخدمها شاشة المصروفات والتقارير.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <div className="p-12 text-center text-slate">
                <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                جار تحميل الإعدادات
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>النوع</th>
                    <th>الحالة</th>
                    <th>الترتيب</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.isCompanySettlement ? "تسديد شركة" : "صرف داخلي"}</td>
                      <td>{category.isActive ? "نشط" : "معطل"}</td>
                      <td>{category.displayOrder}</td>
                      <td>
                        <Button size="sm" variant="outline" onClick={() => editCategory(category)}>
                          تعديل
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{categoryForm.id ? "تعديل تصنيف" : "إضافة تصنيف"}</CardTitle>
              <CardDescription>كل تعديل هنا سيعتمد مباشرة على Prisma والـ API الجديدة.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveCategory}>
                <Field label="اسم التصنيف">
                  <Input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
                </Field>
                <Field label="الترتيب">
                  <Input value={categoryForm.displayOrder} onChange={(event) => setCategoryForm((current) => ({ ...current, displayOrder: event.target.value }))} />
                </Field>
                <label className="flex items-center gap-3 text-sm text-ink">
                  <input type="checkbox" checked={categoryForm.isCompanySettlement} onChange={(event) => setCategoryForm((current) => ({ ...current, isCompanySettlement: event.target.checked }))} />
                  تسديد شركة
                </label>
                <label className="flex items-center gap-3 text-sm text-ink">
                  <input type="checkbox" checked={categoryForm.isActive} onChange={(event) => setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))} />
                  تصنيف نشط
                </label>
                {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                  {categoryForm.id ? "حفظ التعديل" : "إضافة التصنيف"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الشهر النشط</CardTitle>
              <CardDescription>تحديد الفترة الرئيسية للتشغيل والتقارير.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="surface-muted px-4 py-4 text-sm text-slate">
                {activeMonth ? `${monthNames[activeMonth.month - 1]} ${activeMonth.year} - ${activeMonth.daysInMonth} يوم` : "لم يتم تعيين شهر نشط بعد."}
              </div>
              <form className="space-y-4" onSubmit={saveMonth}>
                <Field label="الشهر">
                  <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={monthForm.month} onChange={(event) => setMonthForm((current) => ({ ...current, month: event.target.value }))}>
                    {monthNames.map((name, index) => (
                      <option key={name} value={String(index + 1)}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="السنة">
                  <Input value={monthForm.year} onChange={(event) => setMonthForm((current) => ({ ...current, year: event.target.value }))} />
                </Field>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                  تعيين الشهر النشط
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
