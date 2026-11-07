// EDTO performance: chart data and calculations. No DOM.
// Loaded by index.html as a plain script (window.PERF) and by the tests (require).
// All chart lookups interpolate linearly and never extrapolate: outside the chart = null.
(function (root) {
  "use strict";

  // ---------- B737-800 ENGINE INOP data ----------
  // Source: D6-27370-8H6-MAS, OI.4.6, October 01, 2024. Transcribed by hand.
  // "-" cells in the chart are null (no data).
  const B738 = {
    criticalFuel: {
      title: "310 KIAS Cruise Critical Fuel Reserves",
      distances: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400],
      weights: [45, 55, 65, 75, 85], // weight at critical point, 1000 kg
      fuel: [                         // fuel required, 1000 kg, nil wind
        [3.4, 3.5, 3.7, 3.9, 4.1],
        [4.2, 4.3, 4.5, 4.7, 5.0],
        [5.0, 5.2, 5.3, 5.6, 5.9],
        [null, 6.0, 6.2, 6.5, 6.8],
        [null, 6.8, 7.0, 7.3, 7.6],
        [null, 7.6, 7.8, 8.2, 8.5],
        [null, 8.5, 8.8, 9.0, 9.4],
        [null, 9.2, 9.5, 9.8, 10.3],
        [null, 10.1, 10.4, 10.8, 11.2],
        [null, 10.9, 11.2, 11.6, 12.0],
        [null, 11.7, 12.0, 12.4, 12.9],
      ],
      windAxis: [-50, 50, 100], // kt, headwind positive: 50 TWC, 50 HWC, 100 HWC
      windCorr: [
        [-0.4, 0.6, 1.4],
        [-0.5, 0.7, 1.7],
        [-0.7, 0.8, 2.1],
        [-0.7, 1.0, 2.4],
        [-0.8, 1.2, 2.9],
        [-0.9, 1.3, 3.2],
        [-1.0, 1.4, 3.5],
        [-1.1, 1.7, 3.8],
        [-1.2, 1.7, 4.1],
        [-1.3, 1.9, null],
        [-1.4, 2.0, null],
      ],
      isaPctPer10C: 0.5, // +0.5 % per 10 °C above ISA
      icingPct: 17,      // engine + wing anti-ice (5 %) + ice accumulation (12 %)
    },
    // Max Continuous Thrust, 100 ft/min residual rate of climb.
    // Rows: ISA+10 °C and below, ISA+15 °C, ISA+20 °C. Columns: weights.
    altitudeCapability: {
      isaAxis: [10, 15, 20],
      weights: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
      lrc: {
        title: "Long Range Cruise (STANDARD strategy)",
        alt: [
          [33800, 31400, 29000, 26300, 24100, 22500, 20900, 19200, 17200, 15200],
          [33000, 30500, 27700, 24800, 23000, 21300, 19700, 17400, 15300, 12600],
          [31800, 29200, 25800, 23500, 21600, 19800, 17300, 15000, 12500, 9900],
        ],
        antiIce: { engine: 1200, engineWing: 5500 },
      },
      kias310: {
        title: "310 KIAS (FIXED SPEED strategy)",
        alt: [
          [19800, 19500, 19100, 18700, 18100, 17500, 16700, 16000, 15200, 14200],
          [18200, 17900, 17500, 17000, 16500, 15800, 15100, 14300, 13400, 12400],
          [16200, 15900, 15500, 15000, 14400, 13700, 12900, 12000, 11100, 10100],
        ],
        antiIce: { engine: 1200, engineWing: 4900 },
      },
    },
  };

  // Performance data per variant. null = no chart data loaded yet.
  const VARIANTS = { "737-800": B738, "737-8": null };

  // ---------- calculations ----------
  const EPS = 1e-9;

  /** Linear interpolation over ascending xs. ys may contain nulls. */
  function interp(xs, ys, x) {
    if (!Number.isFinite(x)) return null;
    if (x < xs[0] - EPS || x > xs[xs.length - 1] + EPS) return null;
    for (let i = 0; i < xs.length; i++) if (Math.abs(x - xs[i]) < EPS) return ys[i] ?? null;
    for (let i = 0; i < xs.length - 1; i++) {
      if (x > xs[i] && x < xs[i + 1]) {
        const a = ys[i], b = ys[i + 1];
        if (a == null || b == null) return null;
        return a + ((b - a) * (x - xs[i])) / (xs[i + 1] - xs[i]);
      }
    }
    return null;
  }

  /** "1430", "14:30" or "930" -> minutes after midnight. */
  function parseHHMM(s) {
    const m = String(s ?? "").trim().match(/^(\d{1,2}):?(\d{2})$/);
    if (!m) return null;
    const h = +m[1], min = +m[2];
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  function formatHHMM(mins) {
    const h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  /**
   * Fuel and weight at the ETP. Times UTC "HHMM"; an ETA earlier than now is
   * taken as the next day. kg and kg/h.
   */
  function etpWeight({ zfw, fob, nowUtc, etaUtc, burnKgH }) {
    const now = parseHHMM(nowUtc), eta = parseHHMM(etaUtc);
    if (now == null || eta == null) return { error: "Enter times as HHMM (UTC)." };
    if (![zfw, fob, burnKgH].every(Number.isFinite)) return { error: "Enter ZFW, fuel on board and burn rate." };
    if (zfw <= 0 || fob < 0 || burnKgH <= 0) return { error: "ZFW and burn rate must be above zero." };
    const minutes = (eta - now + 1440) % 1440;
    const fuelToBurn = (burnKgH * minutes) / 60;
    const fuelRemaining = fob - fuelToBurn;
    return {
      minutes, fuelToBurn, fuelRemaining,
      grossWeight: zfw + fuelRemaining,
      warning: fuelRemaining < 0 ? "Fuel to burn exceeds fuel on board." : null,
    };
  }

  /** Engine-inop altitude capability (ft). weightT in 1000 kg. antiIce: off | engine | engineWing. */
  function altitudeCapability(data, strategy, weightT, isaDev, antiIce) {
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
   * Engine-inop critical fuel (1000 kg). windKt: headwind positive.
   * Wind first, then ISA and icing percentages compounded (the higher reading).
   */
  function criticalFuel(data, { distNm, weightT, windKt, isaDev, icing }) {
    if (![distNm, weightT, windKt, isaDev].every(Number.isFinite)) return { error: "Fill in every field." };
    const rows = data.fuel.map((r) => interp(data.weights, r, weightT));
    const nilWind = interp(data.distances, rows, distNm);
    if (nilWind == null) return { error: "Outside chart: distance 400–1400 NM, weight 45–85 t (55–85 t beyond 600 NM)." };

    const axis = [data.windAxis[0], 0, ...data.windAxis.slice(1)];
    const colAt = (i) => interp(data.distances, data.windCorr.map((r) => r[i]), distNm);
    const windCorr = interp(axis, [colAt(0), 0, colAt(1), colAt(2)], windKt);
    if (windCorr == null) return { error: "Outside chart: wind 50 kt tailwind to 100 kt headwind (50 kt HW max beyond 1200 NM)." };

    const base = nilWind + windCorr;
    const isaPct = (Math.max(0, isaDev) / 10) * data.isaPctPer10C;
    const icingPct = icing ? data.icingPct : 0;
    const total = base * (1 + isaPct / 100) * (1 + icingPct / 100);
    return { nilWind, windCorr, isaPct, icingPct, total };
  }

  const PERF = { VARIANTS, B738, interp, parseHHMM, formatHHMM, etpWeight, altitudeCapability, criticalFuel };
  if (typeof module === "object" && module.exports) module.exports = PERF;
  else root.PERF = PERF;
})(typeof self !== "undefined" ? self : this);
