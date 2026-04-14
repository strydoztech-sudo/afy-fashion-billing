// lib/printer/label.ts
// Barcode label printer — ZPL (Zebra/TSC) + PDF fallback
// serialport is OPTIONAL — only needed for USB printing

export interface LabelData {
  shopName: string
  productName: string
  barcode: string
  size?: string
  color?: string
  mrp: number
  salePrice: number
  category?: string
}

export function buildZPLLabel(data: LabelData): string {
  const desc = data.size ? `${data.productName} | Sz: ${data.size}` : data.productName
  const shortDesc = desc.length > 32 ? desc.slice(0, 31) + '.' : desc
  return `^XA
^CF0,25
^FO20,10^FB370,2,0,L^FD${data.shopName}^FS
^CF0,20
^FO20,45^FB370,2,0,L^FD${shortDesc}^FS
^FO20,80^BY2,3,50^BCN,,Y,N
^FD${data.barcode}^FS
^CF0,22
^FO20,150^FDMRP: Rs.${data.mrp.toFixed(2)}^FS
^CF0,28
^FO200,145^FDPRICE: Rs.${data.salePrice.toFixed(2)}^FS
^XZ`
}

export function buildZPLBatch(labels: LabelData[]): string {
  return labels.map(buildZPLLabel).join('\n')
}

// Network label printer (LAN/WiFi) — no extra packages needed
export async function printLabelNetwork(
  data: LabelData | LabelData[],
  ip: string,
  port: number = 9100
): Promise<void> {
  const net = await import('net')
  const zpl = Array.isArray(data) ? buildZPLBatch(data) : buildZPLLabel(data)
  const buf = Buffer.from(zpl, 'ascii')
  return new Promise<void>((res, rej) => {
    const client = net.createConnection(port, ip, () => {
      client.write(buf, (err) => {
        if (err) { client.destroy(); rej(err) }
        else { client.end(); res() }
      })
    })
    client.setTimeout(5000)
    client.on('error', rej)
    client.on('timeout', () => { client.destroy(); rej(new Error('Printer connection timeout')) })
  })
}

// USB label printer — only works if serialport is installed
// Run: npm install serialport   (optional)
export async function printLabelUSB(
  data: LabelData | LabelData[],
  port: string = '/dev/usb/lp1'
): Promise<void> {
  let SerialPort: any
  try {
    const sp = require('serialport')
    SerialPort = sp.SerialPort || sp.default?.SerialPort || sp
  } catch {
    throw new Error(
      'USB printing requires serialport package.\n' +
      'Run: npm install serialport\n' +
      'Or use Network mode in Settings instead.'
    )
  }
  const zpl = Array.isArray(data) ? buildZPLBatch(data) : buildZPLLabel(data)
  const buf = Buffer.from(zpl, 'ascii')
  const sp = new SerialPort({ path: port, baudRate: 9600 })
  return new Promise<void>((res, rej) => {
    sp.write(buf, (err: any) => {
      if (err) { sp.close(); rej(err) }
      else sp.drain(() => { sp.close(); res() })
    })
  })
}

// PDF label — works in browser via download
export async function buildPDFLabel(data: LabelData): Promise<string> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
  const doc   = await PDFDocument.create()
  const font  = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const W = 141.73, H = 85.04
  const page = doc.addPage([W, H])

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) })
  page.drawRectangle({ x: 0, y: H - 18, width: W, height: 18, color: rgb(0.88, 0.11, 0.29) })
  page.drawText(data.shopName.toUpperCase(), { x: 4, y: H - 13, size: 8, font, color: rgb(1, 1, 1) })

  const pname = data.productName.length > 28 ? data.productName.slice(0, 27) + '.' : data.productName
  page.drawText(pname, { x: 4, y: H - 28, size: 6.5, font: fontR, color: rgb(0.1, 0.1, 0.1) })

  if (data.size || data.color) {
    const meta = [data.size && `Size: ${data.size}`, data.color && `Color: ${data.color}`].filter(Boolean).join('  ')
    page.drawText(String(meta), { x: 4, y: H - 38, size: 6, font: fontR, color: rgb(0.4, 0.4, 0.4) })
  }

  page.drawText(`Barcode: ${data.barcode}`, { x: 4, y: H - 50, size: 6, font: fontR, color: rgb(0.2, 0.2, 0.2) })
  page.drawLine({ start: { x: 4, y: H - 55 }, end: { x: W - 4, y: H - 55 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  page.drawText(`MRP: Rs.${data.mrp.toFixed(2)}`, { x: 4, y: H - 66, size: 7, font: fontR, color: rgb(0.5, 0.5, 0.5) })
  page.drawText(`Rs.${data.salePrice.toFixed(2)}`, { x: 60, y: H - 68, size: 11, font, color: rgb(0.88, 0.11, 0.29) })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes).toString('base64')
}
