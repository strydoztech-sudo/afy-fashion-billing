# AFY Fashion — Billing Software

Full-featured Point of Sale & Billing system built with Next.js 14, featuring:
- 🧾 POS Billing with barcode scanner support
- 📦 Inventory management with barcode label printing
- 👥 Customer management (GST-ready)
- 📊 Sales reports with GST breakup
- 🖨️ Thermal receipt printer (ESC/POS) integration
- 🏷️ Barcode label printer (ZPL/PDF) integration
- 📷 USB/Bluetooth/Network barcode scanner support

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Setup database
```bash
npm run db:push      # Create SQLite database
npm run db:seed      # Add sample products & settings
```

### 3. Start the app
```bash
npm run dev
# Open http://localhost:3000
```

---

## Hardware Setup

### 🔍 Barcode Scanner (USB)
**No setup needed!** USB scanners work as keyboard input (HID mode).
- Plug in the scanner
- Go to POS Billing page
- Click "Focus Scanner" or click the scan field
- Scan any barcode — product loads automatically!

### 🖨️ Thermal Receipt Printer (ESC/POS)

**Option A — Network (WiFi/LAN) — Recommended:**
1. Connect printer to WiFi or LAN
2. Find printer IP (usually printed on self-test page)
3. Go to Settings → set `Thermal Printer Type = network`, enter IP

**Option B — USB:**
1. Install serialport: `npm install serialport`
2. Find port:
   - Linux: `/dev/usb/lp0` or `/dev/ttyUSB0`
   - Mac: `/dev/tty.usbserial-XXXX`
   - Windows: `COM3` (check Device Manager)
3. Go to Settings → set `Thermal Printer Type = usb`, enter port

**Compatible printers:** Any ESC/POS printer — Epson TM series, TVS RP series, Sewoo, Xprinter, etc.

### 🏷️ Barcode Label Printer (ZPL)

**Network setup:**
1. Connect label printer to LAN
2. Settings → set `Label Printer Type = network`, enter IP

**USB setup:**
1. `npm install serialport`
2. Settings → `Label Printer Type = usb`, enter port (e.g. `/dev/usb/lp1`)

**Compatible:** Zebra ZD220, ZD230, ZD420, TSC DA200, Godex printers (ZPL mode)

> **No ZPL printer?** The app also generates PDF labels — click 🖨️ in Inventory to download PDF label for any OS print dialog.

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| POS Billing | `/billing` | Main cashier screen, scan & bill |
| Inventory | `/inventory` | Products, stock, print labels |
| Customers | `/customers` | Customer profiles & GST details |
| Reports | `/reports` | Daily/date-range sales & GST reports |
| Settings | `/settings` | Shop info & printer configuration |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite via Prisma ORM
- **Styling:** Tailwind CSS
- **Thermal Print:** ESC/POS commands via node buffer
- **Label Print:** ZPL (Zebra) + pdf-lib fallback
- **Barcode Scanner:** Native HID keyboard input

---

## Project Structure

```
app/
  billing/page.tsx       — POS screen
  inventory/page.tsx     — Inventory + label print
  customers/page.tsx     — Customer management
  reports/page.tsx       — Sales reports
  settings/page.tsx      — Printer & shop settings
  api/
    products/route.ts    — Product CRUD + barcode lookup
    customers/route.ts   — Customer CRUD
    bills/route.ts       — Create & list bills
    print/thermal/       — ESC/POS receipt print
    print/label/         — ZPL label print
    settings/route.ts    — Shop settings

lib/
  db/prisma.ts           — Database client
  printer/thermal.ts     — ESC/POS commands builder
  printer/label.ts       — ZPL + PDF label builder
  utils.ts               — Bill number, GST calc, helpers

prisma/
  schema.prisma          — DB models
  seed.ts                — Sample data
```

---

## GST Features
- GST rate per product (0%, 5%, 12%, 18%, 28%)
- GST included in sale price (price = MRP inclusive of GST)
- Receipt shows CGST + SGST breakup per rate slab
- Customer GSTIN support for B2B bills
- Shop GSTIN printed on every receipt

---

## Customization

Edit `prisma/seed.ts` to change default shop name, address, GSTIN, and sample products.

To change receipt format, edit `lib/printer/thermal.ts` → `buildReceiptCommands()`.

To change label format, edit `lib/printer/label.ts` → `buildZPLLabel()`.
