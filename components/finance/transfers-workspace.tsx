"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";

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

type Transfer = {
  id: string;
  fromBox: "cash" | "master" | "swish" | "sagi" | "other_elec" | "bank";
  toBox: "cash" | "master" | "swish" | "sagi" | "other_elec" | "bank";
  amount: string;
  transferDate: string;
  reason: string | null;
  isConfirmed: boolean;
};

const boxLabels = { cash: "كاش", master: "Master", swish: "Swish", sagi: "Sagi", other_elec: "أخرى", bank: "بنك" } as const;

export function TransfersWorkspace() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    fromBox: "cash",
    toBox: "bank",
    amount: "0.000",
    transferDate: new Date().toISOString().slice(0, 10),
    reason: ""
  });

  async function loadTransfers() {
    setLoading(true);
    const response = await fetch(`/api/transfers?month=${month}&year=${year}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: Transfer[]; error?: string };
    if (!response.ok || !payload.data) {
      setLoading(false);
      setError(payload.error ?? "تعذر تحميل التحويلات.");
      return;
    }
    setTransfers(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  function resetForm(closeDialog = true) {
    setForm({
      fromBox: "cash",
      toBox: "bank",
      amount: "0.000",
      transferDate: new Date().toISOString().slice(0, 10),
      reason: ""
    });
    if (closeDialog) {
      setDialogOpen(false);
    }
  }

  async function createTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setSaving(false);
      setError(payload.error ?? "تعذر حفظ التحويل.");
      return;
    }
    resetForm();
    await loadTransfers();
    setSaving(false);
  }

  async function confirm(id: string) {
    const response = await fetch(`/api/transfers/${id}/confirm`, { method: "PUT" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "تعذر تأكيد التحويل.");
      return;
    }
    await loadTransfers();
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>التحويلات بين القاصات</CardTitle>
              <CardDescription>التحويل لا يؤثر على الأرصدة إلا بعد التأكيد الرسمي من الإدارة.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Input className="w-20" value={month} onChange={(event) => setMonth(event.target.value)} />
              <Input className="w-28" value={year} onChange={(event) => setYear(event.target.value)} />
              <Button variant="outline" onClick={() => void loadTransfers()}>
                تحديث
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="ml-2 h-4 w-4" />
                تحويل جديد
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>من</th>
                <th>إلى</th>
                <th>المبلغ</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate">
                    <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                    جار تحميل التحويلات
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{transfer.transferDate}</td>
                    <td>{boxLabels[transfer.fromBox]}</td>
                    <td>{boxLabels[transfer.toBox]}</td>
                    <td className="font-mono">{transfer.amount}</td>
                    <td>{transfer.reason ?? "-"}</td>
                    <td>{transfer.isConfirmed ? "مؤكد" : "بانتظار التأكيد"}</td>
                    <td>
                      {!transfer.isConfirmed ? (
                        <Button size="sm" onClick={() => void confirm(transfer.id)}>
                          <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                          تأكيد
                        </Button>
                      ) : (
                        "-"
                      )}
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
            <DialogTitle>تحويل جديد</DialogTitle>
            <DialogDescription>إنشاء تحويل جديد مع انتظار التأكيد قبل التأثير على الأرصدة.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createTransfer}>
            <Field label="من قاصة">
              <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.fromBox} onChange={(event) => setForm((current) => ({ ...current, fromBox: event.target.value as Transfer["fromBox"] }))}>
                {Object.entries(boxLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="إلى قاصة">
              <select className="flex h-11 w-full rounded-2xl border border-slate/15 bg-white px-4 text-sm" value={form.toBox} onChange={(event) => setForm((current) => ({ ...current, toBox: event.target.value as Transfer["toBox"] }))}>
                {Object.entries(boxLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="المبلغ">
              <Input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
            </Field>
            <Field label="التاريخ">
              <Input type="date" value={form.transferDate} onChange={(event) => setForm((current) => ({ ...current, transferDate: event.target.value }))} />
            </Field>
            <Field label="السبب">
              <Input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            </Field>
            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                إنشاء التحويل
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
