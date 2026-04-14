# AFY Fashion Billing v2.0 — Setup Guide

## Quick Start (3 steps)

### Step 1 — Install packages
```bash
npm install
```

### Step 2 — Setup database
```bash
npm run db:push
npm run db:seed
```

### Step 3 — Start
```bash
npm run dev
```
Open: http://localhost:3000

---

## Fix for "Failed to save product" error

The error was caused by missing `.env` file. This version includes it automatically.

The `.env` file contains:
```
DATABASE_URL="file:./prisma/afy_fashion.db"
```

---

## New in v2.0

### Add Product — New Fields
| Field | Description |
|-------|-------------|
| Actual Cost (₹) | Your real buying/manufacturing cost |
| Purchase / Wholesale Rate (₹) | Rate you buy from supplier |
| MRP (₹) | Maximum Retail Price (printed on label) |
| Sale Price (₹) | Price you charge customer |

Live profit + margin calculation shows while you fill the form!

### Barcode Generator (new sidebar option)
- Select any product → see live label preview
- Set quantity (1, 5, 10, 25, 50 or custom)
- **Print (Browser)** — opens print dialog, works on any printer
- **Send to Label Printer** — sends ZPL directly to Zebra/TSC printer
- **Download PDF** — PDF for printing later
- Quick Print table — print any product's labels from one screen

### Inventory — New Columns
- Cost price column
- Purchase rate column
- **Profit per unit** and **margin %** shown for every product

### Sidebar
- New **🔢 Barcode Generator** menu item added

---

## Printer Setup (Settings page)

### Thermal Receipt Printer
- Type: `network` → enter IP (e.g. 192.168.1.100), port 9100
- Type: `usb` → install `npm install serialport`, enter port (COM3 / /dev/usb/lp0)

### Barcode Label Printer
- Type: `network` → enter IP (e.g. 192.168.1.101)
- Type: `usb` → enter port (COM4 / /dev/usb/lp1)

### Browser Print (no printer setup needed!)
- Go to Barcode Generator → select product → click "Print (Browser)"
- Works with any printer connected to your computer!
