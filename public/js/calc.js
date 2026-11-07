// Pure calculation functions. No DOM. All chart lookups interpolate linearly
// and never extrapolate: anything outside the chart returns null.

const EPS = 1e-9;

/** Linear interpolation over ascending xs. ys may contain nulls. */
export function interp(xs, ys, x) {
  if (!Number.isFinite(x)) return null;
  if (x < xs[0] - EPS || x > xs[xs.length - 1] + EPS) return null;
  for (let i = 0; i < xs.length; i++) {
    if (Math.abs(x - xs[i]) < EPS) return ys[i] ?? null;
  }
  for (let i = 0; i < xs.length - 1; i++) {
    if (x > xs[i] && x < xs[i + 1]) {
      const a = ys[i], b = ys[i + 1];
      if (a == null || b == null) return null;
      return a + ((b - a) * (x - xs[i])) / (xs[i + 1] - xs[i]);
    }
  }
  return null;
}

/** Parse "1430", "14:30" or "930" into minutes after midnight. */
export function parseHHMM(s) {
  const m = String(s ?? "").trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return null;
  const h = +m[1], min = +m[2];
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatHHMM(mins) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

/**
 * Fuel and weight at the ETP.
 * Times are UTC "HHMM"; an ETA earlier than now is taken as the next day.
 * Weights and fuel in kg, burn in kg/h.
 */
export function etpWeight({ zfw, fob, nowUtc, etaUtc, burnKgH }) {
  const now = parseHHMM(nowUtc), eta = parseHHMM(etaUtc);
  if (now == null || eta == null) return { error: "Enter times as HHMM (UTC)." };
  if (![zfw, fob, burnKgH].every(Number.isFinite)) return { error: "Enter ZFW, fuel on board and burn rate." };
  if (zfw <= 0 || fob < 0 || burnKgH <= 0) return { error: "ZFW and burn rate must be above zero." };
  const minutes = (eta - now + 1440) % 1440;
  const fuelToBurn = (burnKgH * minutes) / 60;
  const fuelRemaining = fob - fuelToBurn;
  return {
    minutes,
    fuelToBurn,
    fuelRemaining,
    grossWeight: zfw + fuelRemaining,
    warning: fuelRemaining < 0 ? "Fuel to burn exceeds fuel on board." : null,
  };
}

/**
 * Engine-inop altitude capability (ft) for one strategy table.
 * weightT in 1000 kg. antiIce: "off" | "engine" | "engineWing".
 */
export function altitudeCapability(data, strategy, weightT, isaDev, antiIce = "off") {
  const t = data[strategy];
  if (!Number.isFinite(isaDev)) return null;
  const isa = Math.max(isaDev, data.isaAxis[0]); // "ISA+10 and below" column
  const byIsa = t.alt.map((col) => interp(data.weights, col, weightT));
  const alt = interp(data.isaAxis, byIsa, isa);
  if (alt == null) return null;
  const dec = antiIce === "engine" ? t.antiIce.engine : antiIce === "engineWing" ? t.antiIce.engineWing : 0;
  return alt - dec;
}

/**
 * Engine-inop critical fuel (1000 kg).
 * windKt: headwind positive, tailwind negative.
 * Corrections: wind first, then ISA and icing percentages compounded
 * (gives the higher of the two possible readings).
 */
export function criticalFuel(data, { distNm, weightT, windKt, isaDev, icing }) {
  if (![distNm, weightT, windKt, isaDev].every(Number.isFinite)) return { error: "Fill in every field." };
  const rows = data.fuel.map((r) => interp(data.weights, r, weightT));
  const nilWind = interp(data.distances, rows, distNm);
  if (nilWind == null) return { error: "Outside chart: distance 400–1400 NM, weight 45–85 t (55–85 t beyond 600 NM)." };

  const axis = [data.windAxis[0], 0, ...data.windAxis.slice(1)];
  const colAt = (i) => interp(data.distances, data.windCorr.map((r) => r[i]), distNm);
  const corrs = [colAt(0), 0, colAt(1), colAt(2)];
  const windCorr = interp(axis, corrs, windKt);
  if (windCorr == null) return { error: "Outside chart: wind 50 kt tailwind to 100 kt headwind (50 kt HW max beyond 1200 NM)." };

  const base = nilWind + windCorr;
  const isaPct = (Math.max(0, isaDev) / 10) * data.isaPctPer10C;
  const icingPct = icing ? data.icingPct : 0;
  const total = base * (1 + isaPct / 100) * (1 + icingPct / 100);
  return { nilWind, windCorr, isaPct, icingPct, total };
}
