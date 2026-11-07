import { VARIANTS } from "./data/index.js";
import { etpWeight, altitudeCapability, criticalFuel, formatHHMM } from "./calc.js";

const root = document.getElementById("screen-edto");
const STORE = "edto-inputs-v1";
const NOT_SAVED = new Set(["nowUtc", "etaUtc"]); // times go stale; never restore them

const state = { variant: "737-800", antiIce: "off", windDir: "HW", icing: false };
try { Object.assign(state, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch {}

const fields = root.querySelectorAll("[data-key]");
const $ = (id) => document.getElementById(id);
const num = (v) => (v === "" || v == null ? NaN : Number(v));
const kg = (v) => Math.round(v).toLocaleString("en-US") + " kg";
// Conservative display rounding: altitude down to 100 ft, critical fuel up to 100 kg.
const ft = (v) => (Math.floor(v / 100) * 100).toLocaleString("en-US") + " ft";
const kgUp = (t) => kg(Math.ceil((t * 1000) / 100) * 100);
const t1000 = (v) => kg(v * 1000);
const pct = (v) => "+" + v.toFixed(2) + " %";

function utcNow() {
  const d = new Date();
  return String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0");
}

function save() {
  const out = {};
  for (const k in state) if (!NOT_SAVED.has(k)) out[k] = state[k];
  try { localStorage.setItem(STORE, JSON.stringify(out)); } catch {}
}

// Inputs sharing a key (variant, ISA) stay in sync across both sections.
function syncFields(except) {
  fields.forEach((el) => {
    if (el === except) return;
    const v = state[el.dataset.key];
    if (el.type === "checkbox") el.checked = !!v;
    else el.value = v ?? "";
  });
}

fields.forEach((el) => {
  el.addEventListener("input", () => {
    state[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
    syncFields(el);
    save();
    render();
  });
});

$("btn-now").addEventListener("click", () => { state.nowUtc = utcNow(); syncFields(); render(); });

let etpGw = null;
$("btn-gw").addEventListener("click", () => {
  if (etpGw == null) return;
  state.cpw = String(Math.round(etpGw));
  syncFields(); save(); render();
});

root.querySelectorAll(".segmented [data-section]").forEach((b) => {
  b.addEventListener("click", () => {
    root.querySelectorAll(".segmented [data-section]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    root.querySelectorAll(".section").forEach((s) => { s.hidden = s.dataset.section !== b.dataset.section; });
  });
});

function msg(el, text) { el.hidden = !text; el.textContent = text || ""; }

function render() {
  const data = VARIANTS[state.variant];
  root.querySelectorAll(".nodata").forEach((p) => { p.hidden = !!data; });

  // --- Weight at ETP (variant independent)
  const w = etpWeight({
    zfw: num(state.zfw), fob: num(state.fob),
    nowUtc: state.nowUtc, etaUtc: state.etaUtc, burnKgH: num(state.burn),
  });
  const ok = !w.error;
  etpGw = ok ? w.grossWeight : null;
  $("r-time").textContent = ok ? formatHHMM(w.minutes) : "—";
  $("r-burn").textContent = ok ? kg(w.fuelToBurn) : "—";
  $("r-rem").textContent = ok ? kg(w.fuelRemaining) : "—";
  $("r-rem").classList.toggle("bad", ok && w.fuelRemaining < 0);
  $("r-gw").textContent = ok ? kg(w.grossWeight) : "—";
  $("btn-gw").disabled = etpGw == null;
  $("btn-gw").title = etpGw == null ? "Complete the Altitude Capability inputs first" : kg(etpGw);

  // --- Altitude capability
  let altMsg = ok ? w.warning : null;
  const isa = num(state.isa);
  let lrc = null, k310 = null;
  if (ok && data && Number.isFinite(isa)) {
    const tW = w.grossWeight / 1000;
    lrc = altitudeCapability(data.altitudeCapability, "lrc", tW, isa, state.antiIce);
    k310 = altitudeCapability(data.altitudeCapability, "kias310", tW, isa, state.antiIce);
    if (lrc == null) altMsg = "Outside chart: gross weight 40,000–85,000 kg and ISA up to +20 °C.";
  }
  $("r-lrc").textContent = lrc == null ? "—" : ft(lrc);
  $("r-310").textContent = k310 == null ? "—" : ft(k310);
  msg($("r-alt-msg"), altMsg);

  // --- Critical fuel
  const ids = ["c-nil", "c-wind", "c-isa", "c-ice", "c-total"];
  const blank = () => ids.forEach((id) => { $(id).textContent = "—"; });
  const anyInput = ["dist", "cpw", "wind"].some((k) => state[k] !== undefined && state[k] !== "");
  if (!data) { blank(); msg($("c-msg"), null); return; }
  const windMag = state.wind === "" || state.wind == null ? 0 : num(state.wind);
  const cf = criticalFuel(data.criticalFuel, {
    distNm: num(state.dist),
    weightT: num(state.cpw) / 1000,
    windKt: state.windDir === "TW" ? -windMag : windMag,
    isaDev: state.isa === "" || state.isa == null ? 0 : isa,
    icing: !!state.icing,
  });
  if (cf.error) { blank(); msg($("c-msg"), anyInput ? cf.error : null); return; }
  $("c-nil").textContent = t1000(cf.nilWind);
  $("c-wind").textContent = (cf.windCorr >= 0 ? "+" : "−") + t1000(Math.abs(cf.windCorr));
  $("c-isa").textContent = pct(cf.isaPct);
  $("c-ice").textContent = pct(cf.icingPct);
  $("c-total").textContent = kgUp(cf.total);
  msg($("c-msg"), null);
}

if (!state.nowUtc) state.nowUtc = utcNow();
syncFields();
render();
