"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "data_entry";
  isActive: boolean;
  createdAt: string;
};

const roleLabels = { admin: "مدير النظام", manager: "مدير", data_entry: "مدخل بيانات" } as const;

export function UsersWorkspace() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "data_entry",
    isActive: true
  });

  async function loadUsers() {
    setLoading(true);
    const response = await fetch("/api/users", { cache: "no-store" });
    const payload = (await response.json()) as { data?: User[]; error?: string };
    if (!response.ok || !payload.data) {
      setLoading(false);
      setError(payload.error ?? "تعذر تحميل المستخدمين.");
      return;
    }
    setUsers(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm(closeDialog = true) {
    setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "data_entry", isActive: true });
    if (closeDialog) {
      setDialogOpen(false);
    }
  }

  function openCreateDialog() {
    resetForm(false);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive
    });
    setDialogOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSaving(false);
      setError(payload.error ?? "تعذر حفظ المستخدم.");
      return;
    }

    resetForm();
    await loadUsers();
    setSaving(false);
  }

  async function removeUser(id: string) {
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "تعذر حذف المستخدم.");
      return;
    }
    await loadUsers();
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>المستخدمون</CardTitle>
              <CardDescription>إدارة الحسابات والصلاحيات بعد ترحيل النظام بالكامل إلى Next.js.</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة مستخدم
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد</th>
                <th>الصلاحية</th>
                <th>الحالة</th>
                <th>الإنشاء</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate">
                    <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                    جار تحميل المستخدمين
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{roleLabels[user.role]}</td>
                    <td>{user.isActive ? "نشط" : "معطل"}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString("en-GB")}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                          <Pencil className="ml-1 h-3.5 w-3.5" />
                          تعديل
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void removeUser(user.id)}>
                          <Trash2 className="ml-1 h-3.5 w-3.5" />
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? resetForm() : setDialogOpen(true))}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل مستخدم" : "إضافة مستخدم"}</DialogTitle>
            <DialogDescription>إنشاء المستخدمين الجدد أو تعديل صلاحيات الحسابات الحالية.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="الاسم">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="البريد">
              <Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label={`كلمة المرور${editingId ? " (اختيارية)" : ""}`}>
              <Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </Field>
            <Field label="الصلاحية">
              <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as User["role"] }))}>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              حساب نشط
            </label>
            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? "حفظ التعديل" : "إضافة المستخدم"}
              </Button>
              <Button type="button" variant="outline" onClick={() => resetForm()}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
