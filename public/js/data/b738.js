// B737-800 ENGINE INOP data.
// Source: D6-27370-8H6-MAS, OI.4.6, October 01, 2024.
// Transcribed by hand. "-" cells in the chart are null (no data: do not extrapolate).

export const criticalFuel = {
  title: "310 KIAS Cruise Critical Fuel Reserves",
  // Fuel required in 1000 kg, nil wind.
  distances: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400],
  weights: [45, 55, 65, 75, 85], // weight at critical point, 1000 kg
  fuel: [
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
  // Wind correction (1000 kg) per distance row. Wind axis in kt, headwind positive.
  windAxis: [-50, 50, 100],
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
  icingPct: 17, // engine + wing anti-ice (5 %) + ice accumulation (12 %)
};

// Altitude capability, Max Continuous Thrust, 100 ft/min residual climb.
// Columns: ISA+10 °C and below, ISA+15 °C, ISA+20 °C.
const altWeights = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85];

export const altitudeCapability = {
  isaAxis: [10, 15, 20],
  weights: altWeights,
  lrc: {
    title: "Long Range Cruise (STANDARD strategy)",
    alt: [
      // ISA+10 and below
      [33800, 31400, 29000, 26300, 24100, 22500, 20900, 19200, 17200, 15200],
      // ISA+15
      [33000, 30500, 27700, 24800, 23000, 21300, 19700, 17400, 15300, 12600],
      // ISA+20
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
};
