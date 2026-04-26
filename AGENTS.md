# AGENTS.md — Guide for AI Assistants

This file helps AI coding agents (Claude, Copilot, etc.) understand the project structure and conventions so they can make accurate changes without breaking things.

---

## What this project is

A single-page React app for managing a small thrift / vintage clothing store. One owner, no multi-user, no backend. All state lives in browser `localStorage`.

---

## Key architecture decisions

### Single-file app
All components, helpers, constants, and styles live in `src/App.jsx`. There is no component directory, no CSS modules, and no separate utility files. Keep it that way unless the file exceeds ~2000 lines.

### Styling
All styles are inline (`style={{}}`), except for responsive/layout rules which are injected via a `<style>` tag inside the `App` component. There is no Tailwind, no CSS-in-JS library, and no `.css` files (other than `index.css` which just resets margin).

When adding responsive behavior, add CSS class rules to the `<style>` block in `App`, and add `className` to the relevant element.

### Data model

Stored in localStorage under the key `vintage-shop-v2` as JSON:

```js
{
  purchases: [
    {
      id: string,          // uid()
      name: string,
      category: "fashion" | "vintage" | "handmade",
      intent: "for_sale" | "self_own",
      cost: number,        // NT$
      source: string,      // from SOURCES array
      isNew: boolean,
      date: string,        // "YYYY-MM-DD"
      notes: string,
      photos: string[],    // base64 JPEG strings, max 5, stripped on sale
      sold: boolean,
    }
  ],
  sales: [
    {
      id: string,
      purchaseId: string,  // links back to purchases[].id
      name: string,        // copied from purchase at sale time
      category: string,    // copied from purchase
      cost: number,        // copied from purchase
      salePrice: number,
      platform: string,    // from PLATFORMS array
      date: string,        // "YYYY-MM-DD" — sale date
      buyDate: string,     // "YYYY-MM-DD" — purchase date (copied at sale time)
      notes: string,
      photos: string[],    // base64 JPEG, up to 5
    }
  ]
}
```

### Constants that control UI options

These are at the top of `App.jsx` and are the first thing to change when the owner updates their options:

```js
const PLATFORMS = [...];   // where items are sold
const SOURCES   = [...];   // where items are bought
const CATS      = {...};   // item categories with emoji and color
const INTENT    = {...};   // for_sale vs self_own
```

### Color palette

All colors are in the `C` object at the top of the file. Never hardcode hex values elsewhere — always reference `C.xxx`.

---

## Component map

| Component | Purpose |
|---|---|
| `App` | Root: state, callbacks, routing between tabs |
| `HomeTab` | Overview: stats, charts, stock counts |
| `PurchasesTab` | List of purchases, month sub-filter, edit state |
| `SalesTab` | List of sales with profit/revenue summary |
| `WardrobeTab` | All unsold items (no add button — auto-populated) |
| `PurchaseCard` | Expandable row: name/badges collapsed, details+buttons expanded |
| `WardrobeCard` | Same as PurchaseCard but read-only (no edit/delete) |
| `SaleCard` | Expandable: profit collapsed, full detail expanded |
| `AddPurchaseModal` | Sheet/dialog for adding a new purchase |
| `AddSaleModal` | Sheet/dialog for recording a sale |
| `EditPurchaseModal` | Sheet/dialog for editing an existing purchase |
| `ModalSheet` | Reusable wrapper: bottom sheet on mobile, centered dialog on desktop |
| `SideNav` | Desktop sidebar navigation (hidden on mobile) |
| `BottomNav` | Mobile tab bar (hidden on desktop ≥768px) |
| `PhotoUpload` | Up to 5 photos; resizes to 600px JPEG before storing |
| `PhotoStrip` | Read-only display of stored photos with download (↓) button |
| `StatCard` | Clickable stat block used in HomeTab |
| `ChipRow` | Row of selectable pill buttons |
| `MonthNav` | ‹ Month › navigator |

---

## Tab routing

Tab state is `useState("home")` in `App`. The tab ID string maps to which component renders:

| id | Component |
|---|---|
| `"home"` | `HomeTab` |
| `"purchases"` | `PurchasesTab` |
| `"sales"` | `SalesTab` |
| `"inventory"` | `WardrobeTab` |

Note: the tab id is still `"inventory"` internally even though the UI label says "Wardrobe". Do not rename the id — it would break existing nav references.

---

## Gotchas

- **Month filtering**: In `PurchasesTab`, "All" shows all purchases across all time. The 🏷️ and 💜 sub-filters use the selected month. Other tabs (Sales, Home) always filter by selected month.
- **Photos stripped on sale**: In `addSale`, the purchase's `photos` array is set to `[]` to free localStorage space. This is intentional.
- **buyDate**: Stored on the sale record at sale time by looking up `purchase.date`. Old sale records (before this field was added) will have `buyDate: undefined` — the UI handles this gracefully.
- **Source default**: `SOURCES[0]` is used as the default in the add/edit forms. If you change the SOURCES array, the default changes too.
- **localStorage limit**: Photos are the main risk. Each photo is ~50–150 KB as base64. With 5 photos per item and many items, the 5–10 MB limit can be reached. Consider adding an export feature before that happens.

---

## Deployment

```bash
cd my-shop
npm run deploy   # runs build then gh-pages -d dist
```

The `base` in `vite.config.js` must match the GitHub repository name: `/thrift_store_mgmt/`.

GitHub Pages serves from the `gh-pages` branch. Source code lives on `main`.
