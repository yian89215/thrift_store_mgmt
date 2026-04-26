# Shop Ledger — Thrift Store Management App

A mobile-first, offline-capable web app for tracking purchases, sales, and inventory for a small thrift / vintage store. Built with React + Vite and deployed on GitHub Pages.

**Live site:** https://yian89215.github.io/thrift_store_mgmt/

---

## Features

### Overview Tab
- Monthly stats: cost spent on for-sale stock, revenue, profit, self-own spending
- 6-month bar chart (bought vs revenue)
- Stock breakdown by category (pie chart)
- Stat cards are tappable — tap to navigate to the relevant tab

### Purchases Tab
- "All" filter shows every purchase across all time
- 🏷️ / 💜 sub-filters show this month's for-sale or self-own items
- Expand any item to see photos, source, notes, and Edit / Delete buttons
- Edit modal pre-fills all original fields including photos

### Sales Tab
- Each card shows profit (▲/▼) and sale date in collapsed view
- Expand to see: sale price, cost paid, profit, date bought, date sold, days held
- Photos downloadable via the ↓ button on each thumbnail

### Wardrobe Tab
- All unsold items, automatically synced from Purchases (no manual add needed)
- Expandable list with photos, source, days in wardrobe
- Items held >30 days as "For Sale" are flagged with ⚠️

---

## Data Storage

All data (purchases, sales, photos) is stored in **browser localStorage** under the key `vintage-shop-v2`. Nothing is sent to any server.

- Photos are resized to max 600 px and stored as base64 JPEG (~50–150 KB each)
- When an item is sold, its photos are automatically deleted to free up localStorage space
- localStorage limit is typically 5–10 MB per origin

**Caution:** clearing browser site data or switching to a different browser/device will result in an empty app. Export your data regularly if this is used in production.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| Recharts 3 | Charts (bar, pie) |
| gh-pages 6 | GitHub Pages deployment |

No backend, no database, no authentication.

---

## Local Development

```bash
cd my-shop
npm install
npm run dev       # opens http://localhost:5173
```

## Deploy to GitHub Pages

```bash
cd my-shop
npm run deploy    # builds then pushes dist/ to the gh-pages branch
```

The `base` option in `vite.config.js` is set to `/thrift_store_mgmt/` to match the repository name on GitHub Pages.

---

## Project Structure

```
my-shop/
├── src/
│   └── App.jsx        # entire app in one file (components + logic)
├── public/
├── index.html
├── vite.config.js     # base: '/thrift_store_mgmt/'
└── package.json       # deploy script uses gh-pages
```
