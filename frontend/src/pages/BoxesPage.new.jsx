import { useState, useEffect } from "react";
import api from "../api/client";
import { useCurrency } from "../context/CurrencyContext";
import Modal from "../components/Modal";

const now = new Date();
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");
const parseNum = (s) => parseFloat(String(s).replace(/,/g, "") || "0") || 0;

const BOX_CONFIG = [
  { key:"cash",      label:"💵 كاش",        headerClass:"cash" },
  { key:"master",    label:"💳 ماستر كارد",  headerClass:"master" },
  { key:"swish",     label:"💱 سويج",        headerClass:"swish" },
  { key:"sagi",      label:"🔷 الساقي",      headerClass:"sagi" },
  { key:"other_elec",label:"💳 فيزا أخرى",  headerClass:"other_elec" },
  { key:"bank",      label:"🏦 رصيد البنك",  headerClass:"bank" },
];

export default function BoxesPage() {
  const { fmt } = useCurrency();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [modalBox, setModalBox] = useState(null); // { box, type: 'opening'|'actual' }
  const [modalVal, setModalVal] = useState("");
  const [saving, setSaving] = useState(false);

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  const load = async (m, y) => {
    setLoading(true);
    try {
      const res = await api.get("/boxes", { params: { month: m, year: y } });
      setBoxes(res.data?.data || []);
    } catch (e) {
      setAlert({ type:"danger", msg: e.response?.data?.message || "فشل تحميل القاصات" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(month, year); }, []);

  const openModal = (box, type) => {
    setModalBox({ box, type });
    setModalVal(type === "opening" ? (box.openingBalance ?? "") : (box.actualBalance ?? ""));
  };

  const handleSave = async () => {
    if (!modalBox) return;
    setSaving(true);
    try {
      const { box, type } = modalBox;
      const val = parseNum(modalVal);
      if (type === "opening") {
        await api.put(`/boxes/${box.boxType}/opening`, { month, year, openingBalance: val });
        setAlert({ type:"success", msg:"✅ تم تحديث الرصيد الافتتاحي" });
      } else {
        await api.put(`/boxes/${box.boxType}/actual`, { month, year, actualBalance: val });
        setAlert({ type:"success", msg:"✅ تم تحديث الرصيد الفعلي وحساب الفارق" });
      }
      setModalBox(null);
      load(month, year);
    } catch (e) {
      setAlert({ type:"danger", msg: e.response?.data?.message || "فشل التحديث" });
    } finally { setSaving(false); }
  };

  const totalCalculated = boxes.reduce((a, b) => a + +b.calculatedBalance, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏦 أرصدة القاصات</div>
          <div className="page-subtitle">عرض وإدارة أرصدة القاصات الستة</div>
        </div>
        <div className="page-actions">
          <select className="form-control" value={month} onChange={e => setMonth(+e.target.value)} style={{ width:110 }}>
            {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <input className="form-control" type="text" inputMode="numeric" value={year}
            onChange={e => setYear(+e.target.value)} style={{ width:90 }} placeholder="السنة" />
          <button className="btn btn-primary" onClick={() => load(month, year)}>🔄</button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.msg}
          <button className="alert-close" onClick={() => setAlert(null)}>✕</button>
        </div>
      )}

      {/* Summary */}
      {boxes.length > 0 && (
        <div className="kpi-grid mb-20" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))" }}>
          <div className="kpi-card blue">
            <div className="kpi-icon">🧮</div>
            <div className="kpi-label">إجمالي الرصيد المحسوب</div>
            <div className="kpi-value neutral">{fmt(totalCalculated)}</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon">✅</div>
            <div className="kpi-label">القاصات التي جُرِدَت</div>
            <div className="kpi-value positive">{boxes.filter(b => b.actualBalance != null).length} / {boxes.length}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /> جاري التحميل...</div>
      ) : boxes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="icon">🏦</span>
            <p>لا توجد بيانات. أدخل مبيعات أولاً ثم اضغط تحميل.</p>
          </div>
        </div>
      ) : (
        <div className="box-grid">
          {BOX_CONFIG.map(({ key, label, headerClass }) => {
            const box = boxes.find(b => b.boxType === key);
            if (!box) return (
              <div key={key} className="box-card">
                <div className={`box-card-header ${headerClass}`}>{label}</div>
                <div className="box-card-body">
                  <div className="empty-state" style={{ padding:14 }}><p>لا توجد بيانات</p></div>
                </div>
              </div>
            );

            const diff = box.difference != null ? +box.difference : null;
            const diffClass = diff === null ? "" : diff > 0 ? "positive" : diff < 0 ? "negative" : "zero";

            return (
              <div key={key} className="box-card">
                <div className={`box-card-header ${headerClass}`}>{label}</div>
                <div className="box-card-body">
                  {[
                    { label:"رصيد الشهر السابق", val: fmtNum(box.openingBalance) },
                    { label:"إيرادات فعلية", val: fmtNum(box.incomeActual), cls:"cell-green" },
                    { label:"مصروفات", val: fmtNum(box.totalExpenses), cls:"cell-red" },
                    { label:"تحويل وارد", val: "+"+fmtNum(box.transfersIn), cls:"cell-green" },
                    { label:"تحويل صادر", val: "-"+fmtNum(box.transfersOut), cls:"cell-red" },
                  ].map(({label:l, val, cls}) => (
                    <div key={l} className="box-row">
                      <span className="box-row-label">{l}</span>
                      <span className={`box-row-value ${cls||""}`}>{val} د.ع</span>
                    </div>
                  ))}
                  <div className="box-row" style={{ background:"#eff6ff", borderRadius:6, padding:"6px 8px", marginTop:4 }}>
                    <span className="box-row-label fw-bold">الرصيد المحسوب</span>
                    <span className="box-row-value cell-blue fw-black">{fmtNum(box.calculatedBalance)} د.ع</span>
                  </div>

                  {diff !== null && (
                    <div className={`box-difference ${diffClass}`} style={{ marginTop:8 }}>
                      <span>الفارق</span>
                      <span>
                        {diff > 0 ? `زيادة +${fmtNum(diff)}` : diff < 0 ? `عجز ${fmtNum(diff)}` : "مطابق ✓"}
                      </span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{ display:"flex", gap:6, marginTop:10 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex:1, fontSize:11.5 }}
                      onClick={() => openModal(box, "opening")}
                    >
                      🔧 افتتاحي
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      style={{ flex:1, fontSize:11.5 }}
                      onClick={() => openModal(box, "actual")}
                    >
                      ✅ فعلي
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Update Balance */}
      <Modal
        isOpen={!!modalBox}
        onClose={() => setModalBox(null)}
        title={
          modalBox
            ? modalBox.type === "opening"
              ? `🔧 تحديث الرصيد الافتتاحي — ${BOX_CONFIG.find(b=>b.key===modalBox.box.boxType)?.label}`
              : `✅ إدخال الرصيد الفعلي (الجرد) — ${BOX_CONFIG.find(b=>b.key===modalBox.box.boxType)?.label}`
            : ""
        }
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalBox(null)} disabled={saving}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? "⏳..." : "💾 حفظ"}
            </button>
          </>
        }
      >
        {modalBox && (
          <div>
            <div className="alert alert-info" style={{ marginBottom:14 }}>
              {modalBox.type === "opening"
                ? "أدخل رصيد بداية الشهر لهذه القاصة — يُستخدم في حساب الرصيد المحسوب."
                : "أدخل الرصيد الفعلي عند الجرد — سيُحسب الفارق تلقائياً."}
            </div>
            <div className="form-group">
              <label className="form-label required">
                {modalBox.type === "opening" ? "الرصيد الافتتاحي" : "الرصيد الفعلي"}
              </label>
              <input
                className="form-control"
                type="text"
                inputMode="decimal"
                value={modalVal}
                onChange={e => setModalVal(e.target.value)}
                placeholder="0"
                autoFocus
                style={{ fontSize:18, fontWeight:700, textAlign:"center" }}
              />
              <span className="form-hint">الدينار العراقي (د.ع) — أدخل الرقم بدون فواصل</span>
            </div>
            {modalBox.type === "actual" && (
              <div style={{ marginTop:12, padding:"10px 14px", background:"#f8fafc", borderRadius:8, fontSize:12.5 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span>الرصيد المحسوب</span>
                  <strong className="cell-blue">{fmtNum(modalBox.box.calculatedBalance)} د.ع</strong>
                </div>
                {modalVal && (
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span>الفارق المتوقع</span>
                    <strong className={parseNum(modalVal) - parseNum(modalBox.box.calculatedBalance) >= 0 ? "cell-green" : "cell-red"}>
                      {(parseNum(modalVal) - parseNum(modalBox.box.calculatedBalance) >= 0 ? "+" : "")}
                      {fmtNum(parseNum(modalVal) - parseNum(modalBox.box.calculatedBalance))} د.ع
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
