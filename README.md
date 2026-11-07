# EDTO CRZ App

Installable, offline-capable web app (PWA) with three bottom tabs: **CRZ | EDTO | APP**.

No build step. Plain HTML/CSS/JS in `public/`.

## Run locally
```bash
npx serve public
```

## Deploy (Firebase Hosting)
```bash
firebase deploy --only hosting
```

## Structure
- `public/index.html` – shell, three screens, bottom nav
- `public/app.js` – tab switching (hash routing: `#crz`, `#edto`, `#app`)
- `public/styles.css` – dark cockpit theme
- `public/sw.js` – offline cache (bump `CACHE` version on each release)
