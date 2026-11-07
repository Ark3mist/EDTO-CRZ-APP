const { test } = require("node:test");
const assert = require("node:assert/strict");
const { interp, parseHHMM, etpWeight, altitudeCapability, criticalFuel, B738 } = require("../perf.js");

const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test("interp: exact, between, out of range, null neighbour", () => {
  assert.equal(interp([0, 10], [0, 100], 10), 100);
  near(interp([0, 10], [0, 100], 2.5), 25);
  assert.equal(interp([0, 10], [0, 100], 11), null);
  assert.equal(interp([0, 10, 20], [null, 5, 6], 5), null);
  assert.equal(interp([0, 10, 20], [null, 5, 6], 10), 5);
});

test("parseHHMM", () => {
  assert.equal(parseHHMM("1430"), 870);
  assert.equal(parseHHMM("14:30"), 870);
  assert.equal(parseHHMM("930"), 570);
  assert.equal(parseHHMM("2460"), null);
  assert.equal(parseHHMM(""), null);
});

test("etpWeight: basic and midnight rollover", () => {
  const r = etpWeight({ zfw: 60000, fob: 15000, nowUtc: "1200", etaUtc: "1330", burnKgH: 2400 });
  assert.equal(r.minutes, 90);
  near(r.fuelToBurn, 3600);
  near(r.fuelRemaining, 11400);
  near(r.grossWeight, 71400);
  assert.equal(r.warning, null);
  assert.equal(etpWeight({ zfw: 60000, fob: 15000, nowUtc: "2330", etaUtc: "0030", burnKgH: 2400 }).minutes, 60);
  assert.ok(etpWeight({ zfw: 60000, fob: 1000, nowUtc: "1200", etaUtc: "1300", burnKgH: 2400 }).warning);
});

test("altitude capability: chart points, interpolation, anti-ice, limits", () => {
  const d = B738.altitudeCapability;
  assert.equal(altitudeCapability(d, "lrc", 85, 0), 15200);
  assert.equal(altitudeCapability(d, "lrc", 85, -20), 15200);
  assert.equal(altitudeCapability(d, "lrc", 40, 20), 31800);
  assert.equal(altitudeCapability(d, "kias310", 60, 15), 16500);
  near(altitudeCapability(d, "lrc", 72.5, 10), (20900 + 19200) / 2);
  near(altitudeCapability(d, "lrc", 85, 12.5), (15200 + 12600) / 2);
  assert.equal(altitudeCapability(d, "lrc", 85, 10, "engine"), 14000);
  assert.equal(altitudeCapability(d, "kias310", 85, 10, "engineWing"), 9300);
  assert.equal(altitudeCapability(d, "lrc", 86, 10), null);
  assert.equal(altitudeCapability(d, "lrc", 60, 21), null);
});

test("critical fuel: chart points, wind, corrections, limits", () => {
  const d = B738.criticalFuel;
  const base = { isaDev: 0, icing: false, windKt: 0 };
  near(criticalFuel(d, { ...base, distNm: 400, weightT: 45 }).total, 3.4);
  near(criticalFuel(d, { ...base, distNm: 1400, weightT: 85 }).total, 12.9);
  near(criticalFuel(d, { ...base, distNm: 1000, weightT: 70 }).total, (8.8 + 9.0) / 2);
  near(criticalFuel(d, { ...base, distNm: 1000, weightT: 65, windKt: 50 }).total, 8.8 + 1.4);
  near(criticalFuel(d, { ...base, distNm: 1000, weightT: 65, windKt: -50 }).total, 8.8 - 1.0);
  near(criticalFuel(d, { ...base, distNm: 1000, weightT: 65, windKt: 75 }).windCorr, (1.4 + 3.5) / 2);
  near(criticalFuel(d, { ...base, distNm: 1000, weightT: 65, isaDev: 20 }).total, 8.8 * 1.01);
  near(criticalFuel(d, { ...base, distNm: 1000, weightT: 65, icing: true }).total, 8.8 * 1.17);
  assert.ok(criticalFuel(d, { ...base, distNm: 700, weightT: 45 }).error);
  assert.ok(criticalFuel(d, { ...base, distNm: 1300, weightT: 65, windKt: 100 }).error);
  assert.ok(criticalFuel(d, { ...base, distNm: 350, weightT: 65 }).error);
  assert.ok(criticalFuel(d, { ...base, distNm: 1000, weightT: 65, windKt: -60 }).error);
});
