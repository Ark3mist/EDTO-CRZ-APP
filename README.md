# EDTO CRZ

Offline web app for B737 engine-inop EDTO calculations. Bottom tabs: **CRZ | EDTO | APP**.

One `index.html` (all CSS and app code inline) plus `perf.js` (chart data and calculations).
No build step. Hosted from the repo root on GitHub Pages.

## EDTO tab
- **Altitude capability:** ZFW, fuel on board, current UTC, ETA ETP, burn rate, ISA, anti-ice →
  time to ETP, fuel to burn, fuel remaining, gross weight at ETP, altitude capability (LRC and 310 KIAS).
- **Critical fuel:** distance, weight at critical point, wind, ISA, icing → engine-inop critical fuel.
- Data: B737-800, D6-27370-8H6-MAS OI.4.6 (1 Oct 2024). **737-8 has no data yet.**
- Linear interpolation only, never extrapolates. Altitudes round down to 100 ft, critical fuel up to 100 kg.

## Run locally
```bash
python3 -m http.server 8000
```

## Test
```bash
npm test
```

## Release
Bump the version in three places, all to the same value: `version.json`, `APP_VERSION` in `index.html`, `CACHE` in `sw.js`.
