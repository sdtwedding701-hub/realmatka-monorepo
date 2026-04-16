# RealMatka.in — Full Starter (Next.js App Router + Tailwind)

Colorful, animated scaffold with a **Home page grid** that matches your mock (title, tagline, date badge, OFF DAY red line, 2×3 black cards). Includes market routes, guides, legal, and tools placeholders.

## Quick Start

```bash
unzip realmatka-full-starter.zip
cd realmatka-full-starter
npm install
npm run dev
# open http://localhost:3000
```

## Daily Predictions (Home Grid)

Edit `data/home-predictions.json`:

```json
{
  "date": "2025-09-06",
  "tagline": "Daily Guessing Cards — आज की प्रेडिक्शन (Educational)",
  "offDay": false,
  "markets": [
    { "key": "sita", "name": "SITA", "lines": ["37 58 79"], "offDay": false },
    { "key": "kamal", "name": "KAMAL", "lines": ["21 23 26"], "offDay": false },
    { "key": "andhra", "name": "ANDHRA", "lines": ["50 52 56"], "offDay": false },
    { "key": "star-tara", "name": "STAR TARA", "lines": ["32 35 39"], "offDay": false },
    { "key": "sridevi", "name": "SRIDEVI", "lines": ["12 15 19"], "offDay": false },
    { "key": "mahadevi", "name": "MAHADEVI", "lines": ["01 05 09"], "offDay": false }
  ]
}
```

- Global **OFF DAY** → set `"offDay": true`.
- Per‑market **OFF DAY** → set `"offDay": true` for that market.
- Multiple lines allowed, e.g. `"lines": ["Top 10","37 58 79"]`.

## Markets & Sessions
- `/market/[market]` (Sita, Kamal, Andhra, Star Tara, Sridevi, Bharat, Mahadevi)
- `/market/[market]/[session]` (morning/day/night) — with today's card + last 7 days.

## Customize Colors
Edit these in `app/globals.css`:
```css
--brand-from: 99 102 241;
--brand-to:   59 130 246;
--accent-from: 236 72 153;
--accent-to:   168 85 247;
```Test update 12-09-2025

