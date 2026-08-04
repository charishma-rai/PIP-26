# Pip's Way · Smart Department Navigator

Production Vite + React campus wayfinding web application powered by Vercel Serverless Functions (`/api/`).

## Architecture & Features

- **Frontend (`/src/`)**: Modern React + TypeScript UI styled with Vanilla CSS (pastel color design system, room autocomplete, floor tabs, animated path line with walking chick icon, staircase modal, toast notifications, real camera QR scanner using `html5-qrcode`).
- **Serverless API (`/api/`)**:
  - `GET /api/rooms` - Returns room definitions & metadata
  - `GET /api/categories` - Returns category palette & labels
  - `GET /api/pathway` - Returns corridor polylines & obstacle courtyards
  - `GET /api/route?from=<roomId>&to=<roomId>` - Runs A* pathfinding graph search and returns ordered `{x,y}` waypoints, distance, and named stops.
  - `GET /api/qr/[roomId]` - Generates a PNG QR code for `<url>/?loc=<roomId>` with long-term caching.
  - `GET /api/qr-sheet` - Renders a printable HTML sheet containing QR code location tags.
- **Graph & Data (`/lib/`)**: Verbatim extracted graph building, segment projections, line-of-sight obstacle checks, and A* search algorithm extracted from `pips-way-navigator.html`.

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run with Vercel Dev (Recommended)
`vercel dev` runs both the Vite React frontend and the `/api/` serverless functions on a single port (`http://localhost:3000`), matching production:

```bash
npx vercel dev
```

Alternatively, to run just the Vite frontend dev server:
```bash
npm run dev
```

---

## Deployment

Deploy directly to Vercel with zero additional infra or CORS setup required:

```bash
npx vercel --prod
```

Or connect this repository directly in your [Vercel Dashboard](https://vercel.com) for automatic deployments on `git push`.

---

## Verification & Test Routes

Test sample routes via `/api/route`:
- `GET /api/route?from=lounge&to=comp_lab5`
- `GET /api/route?from=foundation_office&to=aiml_lab2`
- `GET /api/route?from=board_room&to=dept_library`
