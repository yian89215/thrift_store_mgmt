# Shop Ledger — Thrift Store Management App

A mobile-first web app for tracking purchases, sales, and inventory for a small thrift / vintage store. Built with React + Vite, deployed on GitHub Pages, with real-time sync via Firebase Firestore.

**Live site:** https://yian89215.github.io/thrift_store_mgmt/

---

## Features

### Overview Tab
- Monthly stats: cost spent on for-sale stock, revenue, profit, self-own spending
- 6-month bar chart (bought vs revenue)
- Stock breakdown by category (pie chart)
- All stat cards are tappable — navigate directly to the relevant tab
- Stock indicator blocks (for sale / self-own) link to the Wardrobe tab
- No "tap to view" hint text — cards are silently clickable

### Purchases Tab
- Source field has a **+ Other** chip — tap to type a custom source not in the preset list
- "All" filter shows every purchase across all time
- 🏷️ / 💜 sub-filters show this month's for-sale or self-own items
- Expand any item to see photos, source, notes, and Edit / Delete buttons
- Edit modal pre-fills all original fields including photos

### Sales Tab
- Platform field has a **+ Other** chip — tap to type a custom platform not in the preset list
- Swipeable pie charts: **Revenue by Platform** and **Profit by Platform** — shows % and amount per platform
- Swipe left/right or tap the tab strip to switch charts; dot indicator shows current chart
- Each card shows profit (▲/▼) and sale price in collapsed view
- Expand to see: cost paid, sale price, date bought, date sold, days held, notes
- Edit button to update sale price, platform, date, notes, or photos
- Photos downloadable via the ↓ button on each thumbnail

### Wardrobe Tab
- All unsold items, automatically synced from Purchases (no manual add needed)
- Filter by 🏷️ for-sale or 💜 self-own (compact emoji + count format)
- Items held >30 days as "For Sale" are flagged with ⚠️

---

## Data Storage

All data is stored in **Firebase Firestore** (cloud), syncing in real-time across all browsers and devices. The Firestore document path is `shop/data`.

- Photos are resized to max 600 px and stored as base64 JPEG (~50–150 KB each)
- When an item is sold, its photos are automatically deleted to save space
- Firestore document limit is 1 MB — for heavy photo use, Firebase Storage would be the next step

### Migrating from localStorage
If you previously used the app before the Firestore migration, opening the app will show a yellow **"📦 Local data found"** banner. Tap **"Upload to Cloud ☁️"** to migrate all local data to Firestore automatically.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| Recharts 3 | Charts (bar, pie) |
| Firebase 12 (Firestore) | Cloud database, real-time sync |
| gh-pages 6 | GitHub Pages deployment |

---

## Local Development

```bash
cd my-shop
npm install
npm run dev       # opens http://localhost:5173
```

Create a `.env` file in `my-shop/` with your Firebase config (see `src/firebase.js` for required keys). The `.env` file is gitignored — never commit it.

## Deploy

Every `git push` to `main` automatically builds and deploys via **GitHub Actions** (`.github/workflows/deploy.yml`). No manual build step needed.

```bash
# One-shot: deploys Firestore rules + pushes code (triggers Actions):
./deploy.sh
```

Firestore rules are still deployed manually (they rarely change). The app build and GitHub Pages deploy are fully automated.

Firebase config values must be added as **GitHub Secrets** in repo Settings → Secrets → Actions.

---

## Project Structure

```
my-shop/
├── .github/
│   └── workflows/
│       └── deploy.yml  # auto build & deploy on push to main
├── src/
│   ├── App.jsx         # entire app in one file (components + logic)
│   └── firebase.js     # Firestore init, reads config from .env
├── public/
├── .env                # Firebase config (gitignored — do not commit)
├── firestore.rules     # Firestore security rules
├── index.html          # includes no-cache meta tags
├── vite.config.js      # base: '/thrift_store_mgmt/'
└── package.json
deploy.sh               # one-shot deploy script (project root)
```
