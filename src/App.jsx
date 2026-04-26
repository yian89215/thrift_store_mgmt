import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { onSnapshot, setDoc } from "firebase/firestore";
import { SHOP_REF } from "./firebase";

const CATS = {
  fashion:  { label: "Fasion",   emoji: "👗", color: "#C17553", bg: "#FDF0E8" },
  vintage:  { label: "Unique",  emoji: "🧥", color: "#7D5F4E", bg: "#F2E8E3" },
  handmade: { label: "Handmade", emoji: "🧵", color: "#4A7C59", bg: "#E8F2EC" },
};

const INTENT = {
  for_sale: { label: "For Sale", emoji: "🏷️", color: "#C17553", bg: "#FDF0E8" },
  self_own: { label: "Self-Own", emoji: "💜", color: "#7B68C8", bg: "#F0EEFA" },
};

const PLATFORMS = ["Shopee", "Carousell", "Instagram", "Facebook", "Flea Market", "Physical shop"];
const SOURCES   = ["Shopee", "Carousell", "Instagram", "Facebook", "Flea Market", "Physical shop"];

const C = {
  cream: "#FAF5EE", card: "#FFFFFF",
  accent: "#C17553", dark: "#2C1810", mid: "#6B4C3B", light: "#A07060",
  sage: "#4A7C59", sageBg: "#E8F2EC",
  purple: "#7B68C8", purpleBg: "#F0EEFA",
  border: "#EDE0D4", error: "#B5341B",
};

const inputSt = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: `1.5px solid ${C.border}`, fontSize: 14,
  color: C.dark, background: "#fff", display: "block", fontFamily: "inherit",
};

// ── STORAGE ──────────────────────────────────────

const EMPTY = { purchases: [], sales: [] };

// ── HELPERS ──────────────────────────────────────

const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const today   = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const monthOf = (s) => s?.slice(0, 7) ?? "";
const fmt     = (n) => `$${Number(n || 0).toLocaleString()}`;
const fmtDate = (s) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
};
const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const getMonthLabel = (ym) => {
  if (!ym) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [y, m] = ym.split("-");
  return `${months[parseInt(m) - 1]} ${y}`;
};
const adjMonth = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const daysSince = (s) => Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
const daysBetween = (start, end) => {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
};

// Resize image to base64 JPEG
const resizeImage = (file) => new Promise(resolve => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ── ATOMS ────────────────────────────────────────

function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.light, marginBottom: 7,
    letterSpacing: 1, textTransform: "uppercase" }}>{children}</div>;
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12,
      cursor: "pointer", background: value ? C.accent : C.border, position: "relative",
      transition: "background .2s", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: value ? 23 : 3, transition: "left .2s",
        boxShadow: "0 1px 4px rgba(0,0,0,.18)" }} />
    </div>
  );
}

function CatBadge({ cat }) {
  const c = CATS[cat] || CATS.fashion;
  return <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center",
    gap: 3, whiteSpace: "nowrap" }}>{c.emoji} {c.label}</span>;
}

function IntentBadge({ intent }) {
  const i = INTENT[intent] || INTENT.for_sale;
  return <span style={{ background: i.bg, color: i.color, fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center",
    gap: 3, whiteSpace: "nowrap" }}>{i.emoji} {i.label}</span>;
}

function ChipRow({ options, value, onChange, activeColor, activeBg }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "6px 13px", borderRadius: 20, cursor: "pointer", fontSize: 12,
          fontWeight: value === o ? 700 : 400, transition: "all .15s", fontFamily: "inherit",
          border: `1.5px solid ${value === o ? (activeColor || C.accent) : C.border}`,
          background: value === o ? (activeBg || "#FDF0E8") : "#fff",
          color: value === o ? (activeColor || C.accent) : C.mid,
        }}>{o}</button>
      ))}
    </div>
  );
}

function MonthNav({ value, onChange, maxMonth }) {
  const lastMonth = maxMonth || today().slice(0, 7);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      gap: 18, padding: "10px 0 14px" }}>
      <button onClick={() => onChange(adjMonth(value, -1))} style={{
        background: "none", border: "none", fontSize: 22, color: C.accent,
        cursor: "pointer", padding: "2px 8px", lineHeight: 1 }}>‹</button>
      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17,
        fontWeight: 600, color: C.dark }}>{getMonthLabel(value)}</span>
      <button onClick={() => onChange(adjMonth(value, 1))} disabled={value >= lastMonth} style={{
        background: "none", border: "none", fontSize: 22,
        color: value >= lastMonth ? C.border : C.accent,
        cursor: value >= lastMonth ? "default" : "pointer", padding: "2px 8px", lineHeight: 1 }}>›</button>
    </div>
  );
}

function StatCard({ label, value, sub, color, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.card, borderRadius: 16, padding: "14px 15px",
      boxShadow: "0 1px 10px rgba(44,24,16,.06)",
      borderTop: accent ? `3px solid ${accent}` : undefined,
      cursor: onClick ? "pointer" : "default",
      transition: onClick ? "opacity .15s" : undefined }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = ".85"; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.opacity = "1"; }}>
      <div style={{ fontSize: 9, color: C.light, fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: color || C.dark,
        fontFamily: "'Cormorant Garamond', serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── PHOTO UPLOAD ──────────────────────────────────

function PhotoUpload({ photos, onChange }) {
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - photos.length);
    const resized = await Promise.all(files.map(resizeImage));
    onChange([...photos, ...resized].slice(0, 5));
    e.target.value = "";
  };
  const remove = (i) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <div>
      {photos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover",
                borderRadius: 10, border: `1.5px solid ${C.border}` }} />
              <button onClick={() => remove(i)} style={{
                position: "absolute", top: -6, right: -6, width: 20, height: 20,
                borderRadius: "50%", background: C.error, color: "#fff", border: "none",
                cursor: "pointer", fontSize: 13, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          ))}
        </div>
      )}
      {photos.length < 5 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
          borderRadius: 12, cursor: "pointer", border: `1.5px dashed ${C.border}`,
          background: "#fff", fontSize: 13, color: C.mid }}>
          <span style={{ fontSize: 18 }}>📷</span>
          Add photos ({photos.length}/5)
          <input type="file" accept="image/*" multiple onChange={handleFiles}
            style={{ display: "none" }} />
        </label>
      )}
    </div>
  );
}

function PhotoStrip({ photos }) {
  if (!(photos || []).length) return null;
  const download = (src, i) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `photo-${i + 1}.jpg`;
    a.click();
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
      {photos.map((src, i) => (
        <div key={i} style={{ position: "relative" }}>
          <img src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover",
            borderRadius: 8, border: `1px solid ${C.border}`, display: "block" }} />
          <button onClick={e => { e.stopPropagation(); download(src, i); }} title="Download"
            style={{ position: "absolute", bottom: 0, right: 0, background: "rgba(0,0,0,.55)",
              color: "#fff", border: "none", borderRadius: "0 0 8px 0",
              padding: "3px 5px", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>↓</button>
        </div>
      ))}
    </div>
  );
}

// ── MODAL SHELL ───────────────────────────────────

function ModalSheet({ onClose, title, children }) {
  return (
    <div className="modal-overlay">
      <div style={{ position: "absolute", inset: 0, background: "rgba(44,24,16,.45)" }} onClick={onClose} />
      <div className="modal-panel">
        <div className="modal-drag-handle">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 0 18px" }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700,
            color: C.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: C.border, border: "none", borderRadius: "50%",
            width: 28, height: 28, cursor: "pointer", color: C.mid, fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── ADD PURCHASE MODAL ────────────────────────────

function AddPurchaseModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "", category: "vintage", intent: "for_sale",
    cost: "", source: "Japan", isNew: false, date: today(), notes: "", photos: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return alert("Please enter an item name.");
    if (!form.cost || isNaN(+form.cost) || +form.cost <= 0) return alert("Please enter a valid cost.");
    onSave({ ...form, cost: +form.cost });
  };

  return (
    <ModalSheet onClose={onClose} title="Add Purchase">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", minWidth: 0 }}>

        <div>
          <Label>Purpose</Label>
          <div style={{ display: "flex", gap: 10 }}>
            {Object.entries(INTENT).map(([k, i]) => (
              <button key={k} onClick={() => set("intent", k)} style={{
                flex: 1, padding: "14px 8px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                border: `2px solid ${form.intent === k ? i.color : C.border}`,
                background: form.intent === k ? i.bg : "#fff",
                color: form.intent === k ? i.color : C.mid,
                fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 5, transition: "all .15s",
              }}>
                <span style={{ fontSize: 22 }}>{i.emoji}</span>
                {i.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 7, fontSize: 11, color: C.light, textAlign: "center" }}>
            {form.intent === "for_sale" ? "Counted in profit calculation." : "Cost tracked, not counted in profit."}
          </div>
        </div>

        <div>
          <Label>Item Name</Label>
          <input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Levi's 501 Jeans" style={inputSt} />
        </div>

        <div>
          <Label>Category</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(CATS).map(([k, c]) => (
              <button key={k} onClick={() => set("category", k)} style={{
                flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                border: `2px solid ${form.category === k ? c.color : C.border}`,
                background: form.category === k ? c.bg : "#fff",
                color: form.category === k ? c.color : C.mid,
                fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3, transition: "all .15s",
              }}>
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Cost (NT$)</Label>
          <input type="number" value={form.cost} onChange={e => set("cost", e.target.value)}
            placeholder="0" min="0" style={inputSt} />
        </div>

        <div>
          <Label>Source</Label>
          <ChipRow options={SOURCES} value={form.source} onChange={v => set("source", v)} />
        </div>

        {form.category !== "handmade" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fff", borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Brand New</div>
              <div style={{ fontSize: 11, color: C.light }}>Toggle off if secondhand</div>
            </div>
            <Toggle value={form.isNew} onChange={v => set("isNew", v)} />
          </div>
        )}

        <div>
          <Label>Date Purchased</Label>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inputSt} />
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Brand, size, condition…" rows={2} style={{ ...inputSt, resize: "none" }} />
        </div>

        <div>
          <Label>Photos (up to 5)</Label>
          <PhotoUpload photos={form.photos} onChange={v => set("photos", v)} />
        </div>

        <button onClick={save} style={{
          background: form.intent === "self_own" ? C.purple : C.accent,
          color: "#fff", border: "none", borderRadius: 14, padding: "15px",
          fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>Save Purchase</button>
      </div>
    </ModalSheet>
  );
}

// ── ADD SALE MODAL ────────────────────────────────

function AddSaleModal({ onClose, onSave, inventory }) {
  const forSaleInv = inventory.filter(p => p.intent === "for_sale");
  const [form, setForm] = useState({
    purchaseId: forSaleInv[0]?.id || "", salePrice: "",
    platform: "Depop", date: today(), notes: "", photos: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const item = forSaleInv.find(p => p.id === form.purchaseId);
  const profit = item && form.salePrice ? +form.salePrice - +item.cost : null;

  const save = () => {
    if (!form.purchaseId) return alert("Please select an item.");
    if (!form.salePrice || isNaN(+form.salePrice) || +form.salePrice <= 0) return alert("Please enter a valid sale price.");
    onSave({ ...form, salePrice: +form.salePrice, name: item.name, category: item.category, cost: item.cost });
  };

  if (forSaleInv.length === 0) return (
    <ModalSheet onClose={onClose} title="Record a Sale">
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ fontSize: 44 }}>📭</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
          color: C.mid, marginTop: 14 }}>No items for sale</div>
        <div style={{ fontSize: 13, color: C.light, marginTop: 6 }}>
          Add purchases marked "For Sale" first.
        </div>
        <button onClick={onClose} style={{ marginTop: 24, background: C.accent, color: "#fff",
          border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 14,
          cursor: "pointer", fontFamily: "inherit" }}>Got it</button>
      </div>
    </ModalSheet>
  );

  return (
    <ModalSheet onClose={onClose} title="Record a Sale">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", minWidth: 0 }}>

        <div>
          <Label>Item Sold</Label>
          <select value={form.purchaseId} onChange={e => set("purchaseId", e.target.value)} style={inputSt}>
            {forSaleInv.map(p => (
              <option key={p.id} value={p.id}>{p.name} (cost: {fmt(p.cost)})</option>
            ))}
          </select>
          {item && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
              <CatBadge cat={item.category} />
              <span style={{ fontSize: 11, color: C.light }}>from {item.source}</span>
            </div>
          )}
        </div>

        <div>
          <Label>Sale Price (NT$)</Label>
          <input type="number" value={form.salePrice} onChange={e => set("salePrice", e.target.value)}
            placeholder="0" min="0" style={inputSt} />
          {profit !== null && (
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700,
              color: profit >= 0 ? C.sage : C.error }}>
              {profit >= 0 ? "▲" : "▼"} Profit: {fmt(profit)}
            </div>
          )}
        </div>

        <div>
          <Label>Platform</Label>
          <ChipRow options={PLATFORMS} value={form.platform} onChange={v => set("platform", v)}
            activeColor={C.sage} activeBg={C.sageBg} />
        </div>

        <div>
          <Label>Date Sold</Label>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inputSt} />
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            rows={2} style={{ ...inputSt, resize: "none" }} />
        </div>

        <div>
          <Label>Photos (up to 5)</Label>
          <PhotoUpload photos={form.photos} onChange={v => set("photos", v)} />
        </div>

        <button onClick={save} style={{ background: C.sage, color: "#fff", border: "none",
          borderRadius: 14, padding: "15px", fontSize: 15, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit" }}>Confirm Sale</button>
      </div>
    </ModalSheet>
  );
}

// ── HOME TAB ──────────────────────────────────────

function HomeTab({ data, month, setMonth, setTab }) {
  const mPurchases = data.purchases.filter(p => monthOf(p.date) === month);
  const mSales     = data.sales.filter(s => monthOf(s.date) === month);
  const inventory  = data.purchases.filter(p => !p.sold);

  const forSaleBought = mPurchases.filter(p => p.intent === "for_sale");
  const selfOwnBought = mPurchases.filter(p => p.intent === "self_own");
  const forSaleCost   = forSaleBought.reduce((a, p) => a + +p.cost, 0);
  const selfOwnCost   = selfOwnBought.reduce((a, p) => a + +p.cost, 0);
  const revenue       = mSales.reduce((a, s) => a + +s.salePrice, 0);
  const soldCost      = mSales.reduce((a, s) => a + +(s.cost || 0), 0);
  const profit        = revenue - soldCost;

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const ym = adjMonth(month, i - 5);
    const ps = data.purchases.filter(p => monthOf(p.date) === ym && p.intent === "for_sale");
    const ss = data.sales.filter(s => monthOf(s.date) === ym);
    return {
      name: getMonthLabel(ym).slice(0, 3),
      "Bought": ps.reduce((a, p) => a + +p.cost, 0),
      "Revenue": ss.reduce((a, s) => a + +s.salePrice, 0),
    };
  });

  const hasChart = chartData.some(d => d["Bought"] > 0 || d["Revenue"] > 0);

  const catData = Object.entries(CATS).map(([k, c]) => ({
    name: c.label, value: inventory.filter(p => p.category === k && p.intent === "for_sale").length,
    color: c.color,
  })).filter(c => c.value > 0);

  const forSaleStock = inventory.filter(p => p.intent === "for_sale");
  const selfOwnStock = inventory.filter(p => p.intent === "self_own");

  return (
    <div className="tab-content">
      <div className="page-header-center">
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700,
          color: C.dark, margin: 0, letterSpacing: 0.5 }}>✦ Shop Ledger</h1>
        <div style={{ fontSize: 10, color: C.light, marginTop: 3, letterSpacing: 1.5 }}>UNIQUE · HANDMADE</div>
      </div>

      <MonthNav value={month} onChange={setMonth} />

      <div className="stats-grid">
        <StatCard label="For Sale — Bought" value={fmt(forSaleCost)}
          sub={`${forSaleBought.length} item${forSaleBought.length !== 1 ? "s" : ""}`}
          accent={C.accent} onClick={() => setTab("purchases")} />
        <StatCard label="Revenue" value={fmt(revenue)}
          sub={`${mSales.length} sold`} accent={C.sage} onClick={() => setTab("sales")} />
        <StatCard label="Profit" value={fmt(profit)}
          color={profit > 0 ? C.sage : profit < 0 ? C.error : C.mid}
          sub={profit > 0 ? "net gain ✓" : profit < 0 ? "net loss" : "break even"}
          accent={profit >= 0 ? C.sage : C.error} onClick={() => setTab("sales")} />
        <StatCard label="Self-Own — Spent" value={fmt(selfOwnCost)}
          sub={`${selfOwnBought.length} item${selfOwnBought.length !== 1 ? "s" : ""}`}
          color={C.purple} accent={C.purple} onClick={() => setTab("purchases")} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { icon: "🏷️", count: forSaleStock.length, label: "for sale in stock", color: C.accent },
          { icon: "💜", count: selfOwnStock.length, label: "kept for self", color: C.purple },
        ].map(({ icon, count, label, color }) => (
          <div key={label} onClick={() => setTab("inventory")} style={{ flex: 1, background: C.card, borderRadius: 12,
            padding: "10px 14px", boxShadow: "0 1px 8px rgba(44,24,16,.05)",
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "opacity .15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color }}>{count} items</div>
              <div style={{ fontSize: 10, color: C.light }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {hasChart && (
        <div style={{ background: C.card, borderRadius: 16, padding: "16px",
          marginBottom: 14, boxShadow: "0 1px 10px rgba(44,24,16,.06)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 600, color: C.dark }}>
              6-Month Overview
            </span>
            <span style={{ fontSize: 10, color: C.light }}>for sale only</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} barSize={9} barGap={3}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.light }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 12, fontFamily: "inherit" }}
                formatter={(v, n) => [fmt(v), n]} />
              <Bar dataKey="Bought"  fill={C.accent} radius={[4,4,0,0]} />
              <Bar dataKey="Revenue" fill={C.sage}   radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 8 }}>
            {[["Bought", C.accent], ["Revenue", C.sage]].map(([n, c]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.mid }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} />
                {n}
              </div>
            ))}
          </div>
        </div>
      )}

      {catData.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: "16px",
          boxShadow: "0 1px 10px rgba(44,24,16,.06)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 600, color: C.dark }}>
              Stock by Category
            </span>
            <span style={{ fontSize: 10, color: C.light }}>for sale</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <ResponsiveContainer width="48%" height={110}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3} dataKey="value">
                  {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {catData.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <span style={{ color: C.mid, flex: 1 }}>{c.name}</span>
                  <span style={{ fontWeight: 700, color: C.dark }}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.purchases.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 48 }}>🧥</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
            color: C.mid, marginTop: 14 }}>Welcome to your Shop Ledger</div>
          <div style={{ fontSize: 13, color: C.light, marginTop: 6 }}>
            Head to Purchases to add your first item.
          </div>
        </div>
      )}
    </div>
  );
}

// ── EDIT PURCHASE MODAL ───────────────────────────

function EditPurchaseModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    name:     item.name     ?? "",
    category: item.category ?? "vintage",
    intent:   item.intent   ?? "for_sale",
    cost:     item.cost     ?? "",
    source:   SOURCES.includes(item.source) ? item.source : SOURCES[0],
    isNew:    item.isNew    ?? false,
    date:     item.date     ?? today(),
    notes:    item.notes    ?? "",
    photos:   item.photos   ?? [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return alert("Please enter an item name.");
    if (!form.cost || isNaN(+form.cost) || +form.cost <= 0) return alert("Please enter a valid cost.");
    onSave({ ...item, ...form, cost: +form.cost });
  };

  return (
    <ModalSheet onClose={onClose} title="Edit Item">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", minWidth: 0 }}>
        <div>
          <Label>Purpose</Label>
          <div style={{ display: "flex", gap: 10 }}>
            {Object.entries(INTENT).map(([k, i]) => (
              <button key={k} onClick={() => set("intent", k)} style={{
                flex: 1, padding: "14px 8px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                border: `2px solid ${form.intent === k ? i.color : C.border}`,
                background: form.intent === k ? i.bg : "#fff",
                color: form.intent === k ? i.color : C.mid,
                fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 5, transition: "all .15s",
              }}>
                <span style={{ fontSize: 22 }}>{i.emoji}</span>{i.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Item Name</Label>
          <input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Levi's 501 Jeans" style={inputSt} />
        </div>
        <div>
          <Label>Category</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(CATS).map(([k, c]) => (
              <button key={k} onClick={() => set("category", k)} style={{
                flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                border: `2px solid ${form.category === k ? c.color : C.border}`,
                background: form.category === k ? c.bg : "#fff",
                color: form.category === k ? c.color : C.mid,
                fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3, transition: "all .15s",
              }}>
                <span style={{ fontSize: 20 }}>{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Cost (NT$)</Label>
          <input type="number" value={form.cost} onChange={e => set("cost", e.target.value)}
            placeholder="0" min="0" style={inputSt} />
        </div>
        <div>
          <Label>Source</Label>
          <ChipRow options={SOURCES} value={form.source} onChange={v => set("source", v)} />
        </div>
        {form.category !== "handmade" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fff", borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Brand New</div>
              <div style={{ fontSize: 11, color: C.light }}>Toggle off if secondhand</div>
            </div>
            <Toggle value={form.isNew} onChange={v => set("isNew", v)} />
          </div>
        )}
        <div>
          <Label>Date Purchased</Label>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inputSt} />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Brand, size, condition…" rows={2} style={{ ...inputSt, resize: "none" }} />
        </div>
        <div>
          <Label>Photos (up to 5)</Label>
          <PhotoUpload photos={form.photos} onChange={v => set("photos", v)} />
        </div>
        <button onClick={save} style={{
          background: form.intent === "self_own" ? C.purple : C.accent,
          color: "#fff", border: "none", borderRadius: 14, padding: "15px",
          fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>Save Changes</button>
      </div>
    </ModalSheet>
  );
}

// ── PURCHASE CARD ─────────────────────────────────

function PurchaseCard({ item, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const borderColor = item.intent === "self_own" ? C.purple : CATS[item.category]?.color || C.accent;
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: C.card, borderRadius: 14,
      padding: "14px 16px", boxShadow: "0 1px 8px rgba(44,24,16,.05)",
      borderLeft: `3px solid ${borderColor}`, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: C.dark, fontSize: 15 }}>{item.name || "—"}</span>
            {item.sold && <span style={{ fontSize: 10, background: C.sageBg, color: C.sage,
              padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>Sold</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <IntentBadge intent={item.intent || "for_sale"} />
            <CatBadge cat={item.category || "vintage"} />
            {!item.isNew && item.category !== "handmade" &&
              <span style={{ fontSize: 10, background: "#F2E8E3", color: C.mid,
                padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>2nd Hand</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", paddingLeft: 10, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: borderColor }}>{fmt(item.cost)}</div>
          <div style={{ fontSize: 11, color: C.light, marginTop: 2 }}>{fmtDate(item.date)}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}
          onClick={e => e.stopPropagation()}>
          <PhotoStrip photos={item.photos || []} />
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.9 }}>
            {item.source && <div>📍 Source: {item.source}</div>}
            {item.notes  && <div>📝 {item.notes}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => onEdit(item)} style={{
              fontSize: 12, color: C.accent, background: "#FDF0E8",
              border: `1px solid ${C.accent}`, borderRadius: 8, padding: "6px 16px",
              cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
            {!item.sold && (
              <button onClick={() => { if (confirm(`Delete "${item.name}"?`)) onDelete(item.id); }} style={{
                fontSize: 12, color: C.error, background: "#FEE9E7",
                border: `1px solid #F5C2BB`, borderRadius: 8, padding: "6px 16px",
                cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PURCHASES TAB ─────────────────────────────────

function PurchasesTab({ data, month, setMonth, onDelete, onEdit, onAdd }) {
  const [filter, setFilter] = useState("all");
  const [editingItem, setEditingItem] = useState(null);
  const monthItems = data.purchases.filter(p => monthOf(p.date) === month);
  const shown      = filter === "all" ? monthItems : monthItems.filter(p => p.intent === filter);
  const latestPurchaseMonth = data.purchases.reduce((latest, p) => {
    const purchaseMonth = monthOf(p.date);
    return purchaseMonth > latest ? purchaseMonth : latest;
  }, today().slice(0, 7));

  const forSaleTotal = monthItems.filter(p => p.intent === "for_sale").reduce((a, p) => a + +(p.cost||0), 0);
  const selfOwnTotal = monthItems.filter(p => p.intent === "self_own").reduce((a, p) => a + +(p.cost||0), 0);

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22,
            fontWeight: 700, color: C.dark, margin: 0 }}>Purchases</h2>
          <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>Cost tracking</div>
        </div>
        <button onClick={onAdd} style={{ background: C.accent, color: "#fff", border: "none",
          borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>＋ Add</button>
      </div>

      <MonthNav value={month} onChange={setMonth} maxMonth={latestPurchaseMonth} />

      <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
        {[
          { id: "all",      label: `All (${monthItems.length})` },
          { id: "for_sale", label: `🏷️ (${monthItems.filter(p=>p.intent==="for_sale").length})` },
          { id: "self_own", label: `💜 (${monthItems.filter(p=>p.intent==="self_own").length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontSize: 11,
            fontWeight: 700, fontFamily: "inherit",
            border: `1.5px solid ${filter === f.id ? C.dark : C.border}`,
            background: filter === f.id ? C.dark : "#fff",
            color: filter === f.id ? "#fff" : C.mid,
          }}>{f.label}</button>
        ))}
      </div>

      {monthItems.length > 0 && (
        <div style={{ background: C.card, borderRadius: 12, padding: "11px 16px",
          marginBottom: 12, boxShadow: "0 1px 6px rgba(44,24,16,.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: C.light }}>🏷️ For Sale total</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{fmt(forSaleTotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: C.light }}>💜 Self-Own total</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>{fmt(selfOwnTotal)}</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...shown].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(p => (
          <PurchaseCard key={p.id} item={p}
            onDelete={onDelete}
            onEdit={setEditingItem} />
        ))}
      </div>

      {shown.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 20px" }}>
          <div style={{ fontSize: 40 }}>📭</div>
          <div style={{ fontSize: 14, color: C.mid, marginTop: 10 }}>No purchases this month.</div>
        </div>
      )}

      {editingItem && (
        <EditPurchaseModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={updated => { onEdit(updated); setEditingItem(null); }}
        />
      )}
    </div>
  );
}

// ── EDIT SALE MODAL ───────────────────────────────

function EditSaleModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    salePrice: item.salePrice ?? "",
    platform:  PLATFORMS.includes(item.platform) ? item.platform : PLATFORMS[0],
    date:      item.date  ?? today(),
    notes:     item.notes ?? "",
    photos:    item.photos ?? [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const profit = item.cost && form.salePrice ? +form.salePrice - +item.cost : null;

  const save = () => {
    if (!form.salePrice || isNaN(+form.salePrice) || +form.salePrice <= 0)
      return alert("Please enter a valid sale price.");
    onSave({ ...item, ...form, salePrice: +form.salePrice });
  };

  return (
    <ModalSheet onClose={onClose} title="Edit Sale">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", minWidth: 0 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px",
          border: `1.5px solid ${C.border}`, fontSize: 13, color: C.mid }}>
          <span style={{ fontWeight: 700, color: C.dark }}>{item.name}</span>
          <span style={{ marginLeft: 8 }}><CatBadge cat={item.category} /></span>
        </div>
        <div>
          <Label>Sale Price (NT$)</Label>
          <input type="number" value={form.salePrice} onChange={e => set("salePrice", e.target.value)}
            placeholder="0" min="0" style={inputSt} />
          {profit !== null && (
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700,
              color: profit >= 0 ? C.sage : C.error }}>
              {profit >= 0 ? "▲" : "▼"} Profit: {fmt(profit)}
            </div>
          )}
        </div>
        <div>
          <Label>Platform</Label>
          <ChipRow options={PLATFORMS} value={form.platform} onChange={v => set("platform", v)}
            activeColor={C.sage} activeBg={C.sageBg} />
        </div>
        <div>
          <Label>Date Sold</Label>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inputSt} />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            rows={2} style={{ ...inputSt, resize: "none" }} />
        </div>
        <div>
          <Label>Photos (up to 5)</Label>
          <PhotoUpload photos={form.photos} onChange={v => set("photos", v)} />
        </div>
        <button onClick={save} style={{ background: C.sage, color: "#fff", border: "none",
          borderRadius: 14, padding: "15px", fontSize: 15, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit" }}>Save Changes</button>
      </div>
    </ModalSheet>
  );
}

// ── SALE CARD ─────────────────────────────────────

function SaleCard({ item, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const profit   = +item.salePrice - +(item.cost || 0);
  const dateAdded = item.dateAdded || item.forSaleDate || item.buyDate;
  const keptDays = daysBetween(dateAdded, item.date);
  const profitColor = profit > 0 ? C.sage : profit < 0 ? C.error : C.mid;
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: C.card, borderRadius: 14,
      padding: "14px 16px", boxShadow: "0 1px 8px rgba(44,24,16,.05)",
      borderLeft: `3px solid ${profitColor}`, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: C.dark, fontSize: 15, marginBottom: 5 }}>{item.name}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, background: "#F7EFE8", color: C.mid,
              padding: "2px 8px", borderRadius: 20, fontWeight: 700, whiteSpace: "nowrap" }}>
              Price {fmt(item.salePrice)}
            </span>
            <CatBadge cat={item.category} />
            <span style={{ fontSize: 10, background: C.sageBg, color: C.sage,
              padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{item.platform}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", paddingLeft: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: C.light, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase" }}>Profit</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: profitColor, whiteSpace: "nowrap" }}>
            {profit >= 0 ? "▲" : "▼"} {fmt(Math.abs(profit))}
          </div>
          <div style={{ fontSize: 10, color: C.light, marginTop: 1 }}>{fmtDate(item.date)}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}
          onClick={e => e.stopPropagation()}>
          <PhotoStrip photos={item.photos || []} />
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 2 }}>
            <div>💸 Cost: <strong style={{ color: C.accent }}>{fmt(item.cost)}</strong></div>
            <div>🏷️ Price: <strong style={{ color: C.sage }}>{fmt(item.salePrice)}</strong></div>
            <div>📦 Date Added: <strong>{dateAdded ? fmtDate(dateAdded) : "Not available"}</strong></div>
            <div>⏱ Days Kept: <strong>{keptDays !== null
              ? `${keptDays} day${keptDays !== 1 ? "s" : ""}`
              : "Not available"}</strong></div>
            {item.notes && <div>📝 {item.notes}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => onEdit(item)} style={{
              fontSize: 12, color: C.sage, background: C.sageBg,
              border: `1px solid ${C.sage}`, borderRadius: 8, padding: "6px 16px",
              cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
            <button onClick={() => { if (confirm(`Delete sale of "${item.name}"?`)) onDelete(item.id); }} style={{
              fontSize: 12, color: C.error, background: "#FEE9E7",
              border: `1px solid #F5C2BB`, borderRadius: 8, padding: "6px 16px",
              cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SALES CHARTS ─────────────────────────────────

const CHART_COLORS = ["#C17553", "#4A7C59", "#7B68C8", "#D4845A", "#6B9E8A", "#B8A4E8"];

function SalesCharts({ sales }) {
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState(null);

  const go = (n) => setIdx(Math.max(0, Math.min(1, n)));

  const byPlatform = {};
  sales.forEach(s => {
    const p = s.platform || "Other";
    if (!byPlatform[p]) byPlatform[p] = { revenue: 0, profit: 0 };
    byPlatform[p].revenue += +s.salePrice || 0;
    byPlatform[p].profit  += (+s.salePrice || 0) - (+s.cost || 0);
  });

  const totalRevenue = sales.reduce((a, s) => a + (+s.salePrice || 0), 0);
  const totalProfit  = sales.reduce((a, s) => a + (+s.salePrice || 0) - (+s.cost || 0), 0);

  const charts = [
    {
      title: "Revenue", total: totalRevenue, totalColor: C.sage,
      data: Object.entries(byPlatform)
        .map(([name, v]) => ({ name, value: v.revenue }))
        .filter(d => d.value > 0).sort((a, b) => b.value - a.value),
    },
    {
      title: "Profit", total: totalProfit, totalColor: totalProfit >= 0 ? C.sage : C.error,
      data: Object.entries(byPlatform)
        .map(([name, v]) => ({ name, value: v.profit }))
        .filter(d => d.value > 0).sort((a, b) => b.value - a.value),
    },
  ];

  const current = charts[idx];

  return (
    <div style={{ background: C.card, borderRadius: 16, marginBottom: 14,
      boxShadow: "0 1px 10px rgba(44,24,16,.06)", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15,
            fontWeight: 600, color: C.dark }}>{current.title} by Platform</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: current.totalColor }}>
            {fmt(current.total)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {charts.map((_, i) => (
            <div key={i} onClick={() => go(i)} style={{
              width: i === idx ? 16 : 6, height: 6, borderRadius: 3, cursor: "pointer",
              background: i === idx ? C.accent : C.border, transition: "all .2s",
            }} />
          ))}
        </div>
      </div>

      {/* Swipeable slides */}
      <div style={{ overflow: "hidden" }}
        onTouchStart={e => setTouchX(e.touches[0].clientX)}
        onTouchEnd={e => {
          if (touchX === null) return;
          const dx = touchX - e.changedTouches[0].clientX;
          if (Math.abs(dx) > 40) go(idx + (dx > 0 ? 1 : -1));
          setTouchX(null);
        }}>
        <div style={{ display: "flex", transform: `translateX(-${idx * 100}%)`,
          transition: "transform .3s ease" }}>
          {charts.map((chart, ci) => (
            <div key={ci} style={{ minWidth: "100%", padding: "10px 16px 14px",
              display: "flex", alignItems: "center", gap: 4 }}>
              {chart.data.length > 0 ? (
                <>
                  <ResponsiveContainer width="44%" height={130}>
                    <PieChart>
                      <Pie data={chart.data} cx="50%" cy="50%"
                        innerRadius={28} outerRadius={52} paddingAngle={2} dataKey="value">
                        {chart.data.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    {chart.data.map((entry, i) => {
                      const pct = chart.total > 0
                        ? Math.round(entry.value / chart.total * 100) : 0;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center",
                          gap: 5, marginBottom: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%",
                            flexShrink: 0, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span style={{ fontSize: 10, color: C.mid, flex: 1,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.name}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.dark,
                            flexShrink: 0 }}>{pct}%</span>
                          <span style={{ fontSize: 10, color: C.light, flexShrink: 0,
                            marginLeft: 3 }}>{fmt(entry.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ width: "100%", textAlign: "center", padding: "28px 0",
                  fontSize: 12, color: C.light }}>No positive {chart.title.toLowerCase()} this month</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ display: "flex", borderTop: `1px solid ${C.border}` }}>
        {charts.map((chart, i) => (
          <button key={i} onClick={() => go(i)} style={{
            flex: 1, padding: "8px 0", background: "none", border: "none",
            borderBottom: i === idx ? `2px solid ${C.accent}` : "2px solid transparent",
            cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            fontWeight: i === idx ? 700 : 400,
            color: i === idx ? C.accent : C.light, transition: "all .15s",
          }}>{chart.title}</button>
        ))}
      </div>
    </div>
  );
}

// ── SALES TAB ─────────────────────────────────────

function SalesTab({ data, month, setMonth, onDelete, onEdit, onAdd }) {
  const [editingSale, setEditingSale] = useState(null);
  const sales    = data.sales.filter(s => monthOf(s.date) === month);
  const salesWithDates = sales.map(s => {
    if (s.dateAdded || s.buyDate) return s;
    const purchase = data.purchases.find(p => p.id === s.purchaseId);
    const dateAdded = purchase?.dateAdded || purchase?.forSaleDate || purchase?.date;
    return dateAdded ? { ...s, dateAdded, buyDate: dateAdded } : s;
  });
  const revenue  = sales.reduce((a, s) => a + +s.salePrice, 0);
  const soldCost = sales.reduce((a, s) => a + +(s.cost || 0), 0);
  const profit   = revenue - soldCost;

  return (
    <div className="tab-content">
      <div className="page-header">
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22,
            fontWeight: 700, color: C.dark, margin: 0 }}>Sales</h2>
          <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>Revenue & profit</div>
        </div>
        <button onClick={onAdd} style={{ background: C.sage, color: "#fff", border: "none",
          borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          fontFamily: "inherit" }}>＋ Record</button>
      </div>

      <MonthNav value={month} onChange={setMonth} />

      {sales.length > 0 && (
        <div style={{ background: C.card, borderRadius: 12, padding: "12px 16px",
          marginBottom: 12, boxShadow: "0 1px 6px rgba(44,24,16,.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: C.mid }}>{sales.length} item{sales.length !== 1 ? "s" : ""} sold</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.sage }}>Revenue: {fmt(revenue)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: C.mid }}>Cost of goods sold</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{fmt(soldCost)}</span>
          </div>
          <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.mid }}>Profit</span>
            <span style={{ fontSize: 14, fontWeight: 700,
              color: profit >= 0 ? C.sage : C.error }}>{fmt(profit)}</span>
          </div>
        </div>
      )}

      {sales.length > 0 && <SalesCharts sales={sales} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...salesWithDates].sort((a, b) => (b.date||"").localeCompare(a.date||"")).map(s => (
          <SaleCard key={s.id} item={s} onDelete={onDelete} onEdit={setEditingSale} />
        ))}
      </div>

      {sales.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 20px" }}>
          <div style={{ fontSize: 40 }}>🏷️</div>
          <div style={{ fontSize: 14, color: C.mid, marginTop: 10 }}>No sales recorded this month.</div>
        </div>
      )}

      {editingSale && (
        <EditSaleModal
          item={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={updated => { onEdit(updated); setEditingSale(null); }}
        />
      )}
    </div>
  );
}

// ── WARDROBE CARD ─────────────────────────────────

function WardrobeCard({ item }) {
  const [open, setOpen] = useState(false);
  const borderColor = item.intent === "self_own" ? C.purple : CATS[item.category]?.color || C.accent;
  const days  = daysSince(item.date || today());
  const isOld = days > 30 && item.intent === "for_sale";
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: C.card, borderRadius: 14,
      padding: "14px 16px", boxShadow: "0 1px 8px rgba(44,24,16,.05)",
      borderLeft: `3px solid ${borderColor}`, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: C.dark, fontSize: 15, marginBottom: 5 }}>
            {item.name || "—"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <IntentBadge intent={item.intent || "for_sale"} />
            <CatBadge cat={item.category || "vintage"} />
            {!item.isNew && item.category !== "handmade" &&
              <span style={{ fontSize: 10, background: "#F2E8E3", color: C.mid,
                padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>2nd Hand</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", paddingLeft: 10, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: borderColor }}>{fmt(item.cost)}</div>
          <div style={{ fontSize: 11, color: C.light, marginTop: 2 }}>{fmtDate(item.date)}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}
          onClick={e => e.stopPropagation()}>
          <PhotoStrip photos={item.photos || []} />
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.9 }}>
            {item.source && <div>📍 Source: {item.source}</div>}
            <div style={{ color: isOld ? C.error : C.mid }}>
              🕑 {days}d in wardrobe{isOld ? " ⚠️ consider repricing" : ""}
            </div>
            {item.notes && <div>📝 {item.notes}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WARDROBE TAB ──────────────────────────────────

function WardrobeTab({ inventory }) {
  const [filter, setFilter] = useState("all");
  const forSale = inventory.filter(p => p.intent === "for_sale");
  const selfOwn = inventory.filter(p => p.intent === "self_own");
  const shown   = filter === "all" ? inventory : filter === "for_sale" ? forSale : selfOwn;

  return (
    <div className="tab-content">
      <div className="page-header" style={{ paddingBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22,
            fontWeight: 700, color: C.dark, margin: 0 }}>Wardrobe</h2>
          <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>All items on hand</div>
        </div>
      </div>

      {inventory.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {[
            { label: "For Sale", count: forSale.length,
              value: fmt(forSale.reduce((a,p) => a + +(p.cost||0), 0)), color: C.accent },
            { label: "Self-Own", count: selfOwn.length,
              value: fmt(selfOwn.reduce((a,p) => a + +(p.cost||0), 0)), color: C.purple },
          ].map(({ label, count, value, color }) => (
            <div key={label} style={{ flex: 1, background: C.card, borderRadius: 12,
              padding: "12px 14px", boxShadow: "0 1px 6px rgba(44,24,16,.05)",
              borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 9, color: C.light, fontWeight: 700, letterSpacing: 1,
                textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color,
                fontFamily: "'Cormorant Garamond', serif" }}>{value}</div>
              <div style={{ fontSize: 11, color: C.mid }}>{count} item{count !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
        {[
          { id: "all",      label: `All (${inventory.length})` },
          { id: "for_sale", label: `🏷️ (${forSale.length})` },
          { id: "self_own", label: `💜 (${selfOwn.length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontSize: 11,
            fontWeight: 700, fontFamily: "inherit",
            border: `1.5px solid ${filter === f.id ? C.dark : C.border}`,
            background: filter === f.id ? C.dark : "#fff",
            color: filter === f.id ? "#fff" : C.mid,
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...shown].sort((a, b) => (a.date || "").localeCompare(b.date || "")).map(p => (
          <WardrobeCard key={p.id} item={p} />
        ))}
      </div>

      {shown.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 20px" }}>
          <div style={{ fontSize: 48 }}>{filter === "self_own" ? "💜" : filter === "for_sale" ? "🏷️" : "✨"}</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: C.mid, marginTop: 14 }}>
            {inventory.length === 0 ? "Nothing in wardrobe yet." : "No items in this category."}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SIDE NAV (desktop) ────────────────────────────

function SideNav({ tab, setTab }) {
  const tabs = [
    { id: "home",      icon: "◎", label: "Overview" },
    { id: "purchases", icon: "↓", label: "Purchases" },
    { id: "sales",     icon: "↑", label: "Sales" },
    { id: "inventory", icon: "▣", label: "Wardrobe" },
  ];
  return (
    <div className="side-nav">
      <div style={{ padding: "0 24px 24px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20,
          fontWeight: 700, color: C.dark }}>✦ Shop Ledger</div>
        <div style={{ fontSize: 10, color: C.light, letterSpacing: 1.5, marginTop: 2 }}>UNIQUE · HANDMADE</div>
      </div>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          width: "100%", padding: "12px 24px", background: tab === t.id ? "#FDF0E8" : "none",
          border: "none", borderLeft: `3px solid ${tab === t.id ? C.accent : "transparent"}`,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          textAlign: "left", fontFamily: "inherit", transition: "background .15s",
        }}>
          <span style={{ fontSize: 18, color: tab === t.id ? C.accent : C.light }}>{t.icon}</span>
          <span style={{ fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? C.accent : C.mid }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── BOTTOM NAV (mobile) ───────────────────────────

function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "home",      icon: "◎", label: "Overview" },
    { id: "purchases", icon: "↓", label: "Purchases" },
    { id: "sales",     icon: "↑", label: "Sales" },
    { id: "inventory", icon: "▣", label: "Wardrobe" },
  ];
  return (
    <div className="bottom-nav">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0 18px",
          background: "none", border: "none", cursor: "pointer", display: "flex",
          flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 18, color: tab === t.id ? C.accent : C.light, lineHeight: 1.3 }}>{t.icon}</span>
          <span style={{ fontSize: 9, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? C.accent : C.light, letterSpacing: 0.5,
            textTransform: "uppercase" }}>{t.label}</span>
          {tab === t.id && <span style={{ width: 18, height: 2, background: C.accent, borderRadius: 1 }} />}
        </button>
      ))}
    </div>
  );
}

// ── APP ───────────────────────────────────────────

export default function App() {
  const [tab,   setTab]   = useState("home");
  const [data,  setData]  = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);
  const [month, setMonth] = useState(() => today().slice(0, 7));

  const [localBackup, setLocalBackup] = useState(null);

  useEffect(() => {
    const checkLocal = () => {
      try {
        const raw = localStorage.getItem("vintage-shop-v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          const hasData = (parsed.purchases?.length || 0) + (parsed.sales?.length || 0) > 0;
          if (hasData) setLocalBackup(parsed);
        }
      } catch {
        // Ignore malformed local backup data.
      }
    };

    const unsub = onSnapshot(SHOP_REF, (snap) => {
      if (snap.exists()) {
        setData(snap.data());
        setLocalBackup(null);
      } else {
        checkLocal();
        setData(EMPTY);
      }
      setReady(true);
    }, () => {
      // Firestore failed (e.g. rules not set) — still check local data
      checkLocal();
      setReady(true);
    });
    return unsub;
  }, []);

  const update = useCallback((nd) => {
    setData(nd);
    setDoc(SHOP_REF, nd);
  }, []);

  const migrateLocalData = useCallback(() => {
    if (!localBackup) return;
    update(localBackup);
    localStorage.removeItem("vintage-shop-v2");
    setLocalBackup(null);
  }, [localBackup, update]);

  const addPurchase = useCallback((p) => {
    const purchase = { ...p, id: uid(), sold: false };
    if (purchase.intent === "for_sale") purchase.dateAdded = today();
    update({ ...data, purchases: [...data.purchases, purchase] });
    setModal(null);
  }, [data, update]);

  const addSale = useCallback((s) => {
    const purchase = data.purchases.find(p => p.id === s.purchaseId);
    const dateAdded = purchase?.dateAdded || purchase?.forSaleDate || purchase?.date;
    update({
      purchases: data.purchases.map(p =>
        p.id === s.purchaseId ? { ...p, sold: true, photos: [] } : p
      ),
      sales: [...data.sales, { ...s, id: uid(), buyDate: dateAdded, dateAdded }],
    });
    setModal(null);
  }, [data, update]);

  const editPurchase = useCallback((updated) => {
    const original = data.purchases.find(p => p.id === updated.id);
    const next = { ...updated };

    if (next.intent === "for_sale") {
      next.dateAdded = original?.intent === "for_sale"
        ? (next.dateAdded || original?.dateAdded || original?.forSaleDate || original?.date || today())
        : today();
    } else {
      delete next.dateAdded;
      delete next.forSaleDate;
    }

    update({ ...data, purchases: data.purchases.map(p => p.id === updated.id ? next : p) });
  }, [data, update]);

  const deletePurchase = useCallback((id) => {
    update({ ...data, purchases: data.purchases.filter(p => p.id !== id) });
  }, [data, update]);

  const editSale = useCallback((updated) => {
    update({ ...data, sales: data.sales.map(s => s.id === updated.id ? updated : s) });
  }, [data, update]);

  const deleteSale = useCallback((id) => {
    const s = data.sales.find(x => x.id === id);
    update({
      purchases: data.purchases.map(p => p.id === s?.purchaseId ? { ...p, sold: false } : p),
      sales: data.sales.filter(x => x.id !== id),
    });
  }, [data, update]);

  const inventory = data.purchases.filter(p => !p.sold);

  if (!ready) return (
    <div style={{ background: C.cream, height: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: C.accent }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
        input, textarea, select { font-family: inherit; }

        /* ── Layout ── */
        .app-inner {
          display: flex;
          min-height: 100vh;
          max-width: 480px;
          margin: 0 auto;
          position: relative;
        }
        .page-content {
          flex: 1;
          min-width: 0;
          padding-bottom: 80px;
        }
        .tab-content {
          padding: 0 16px 24px;
        }

        /* ── Nav ── */
        .side-nav {
          display: none;
        }
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-top: 1px solid #EDE0D4;
          display: flex;
          z-index: 300;
        }

        /* ── Page headers ── */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 22px;
          padding-bottom: 2px;
        }
        .page-header-center {
          text-align: center;
          padding: 22px 0 6px;
        }

        /* ── Stats ── */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }

        /* ── Wardrobe grid ── */
        .wardrobe-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 400;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .modal-panel {
          position: relative;
          background: #FAF5EE;
          border-radius: 22px 22px 0 0;
          padding: 0 16px 40px;
          max-height: 92vh;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
        }
        .modal-drag-handle {
          display: flex;
          justify-content: center;
          padding: 12px 0 4px;
        }

        /* ── Tablet / Desktop ── */
        @media (min-width: 768px) {
          .app-inner {
            max-width: 1100px;
            gap: 0;
          }
          .side-nav {
            display: flex;
            flex-direction: column;
            width: 220px;
            min-width: 220px;
            background: #fff;
            border-right: 1px solid #EDE0D4;
            padding: 32px 0;
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
          }
          .bottom-nav {
            display: none !important;
          }
          .page-content {
            padding-bottom: 40px;
          }
          .tab-content {
            padding: 0 32px 32px;
            max-width: 820px;
          }
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .wardrobe-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
          .modal-overlay {
            justify-content: center;
            align-items: center;
            padding: 20px;
          }
          .modal-panel {
            border-radius: 22px;
            max-width: 560px;
            width: 100%;
            max-height: 85vh;
          }
          .modal-drag-handle {
            display: none;
          }
          .page-header-center {
            text-align: left;
          }
        }

        @media (min-width: 1024px) {
          .wardrobe-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <div className="app-inner">
        <SideNav tab={tab} setTab={setTab} />
        <div className="page-content">
          {localBackup && (
            <div style={{ margin: "12px 16px 0", background: "#FFF8E7", border: `1.5px solid #F0C040`,
              borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#7A5C00" }}>📦 Local data found</div>
                <div style={{ fontSize: 12, color: "#A07800", marginTop: 3 }}>
                  This device has {localBackup.purchases?.length || 0} purchases &amp; {localBackup.sales?.length || 0} sales stored locally. Upload to cloud so all your devices stay in sync.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={migrateLocalData} style={{
                  background: "#F0C040", color: "#4A3800", border: "none", borderRadius: 10,
                  padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Upload to Cloud ☁️
                </button>
                <button onClick={() => setLocalBackup(null)} style={{
                  background: "none", color: "#A07800", border: `1px solid #F0C040`, borderRadius: 10,
                  padding: "9px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {tab === "home"      && <HomeTab      data={data} month={month} setMonth={setMonth} setTab={setTab} />}
          {tab === "purchases" && <PurchasesTab data={data} month={month} setMonth={setMonth}
            onDelete={deletePurchase} onEdit={editPurchase} onAdd={() => setModal("purchase")} />}
          {tab === "sales"     && <SalesTab     data={data} month={month} setMonth={setMonth}
            onDelete={deleteSale}   onEdit={editSale} onAdd={() => setModal("sale")} />}
          {tab === "inventory" && <WardrobeTab  inventory={inventory} />}
        </div>
      </div>

      <BottomNav tab={tab} setTab={setTab} />

      {modal === "purchase" && <AddPurchaseModal onClose={() => setModal(null)} onSave={addPurchase} />}
      {modal === "sale"     && <AddSaleModal     onClose={() => setModal(null)} onSave={addSale} inventory={inventory} />}
    </div>
  );
}
