// lib/printer/thermal.ts
// ESC/POS thermal receipt printer
// serialport is OPTIONAL — only needed for USB printing

export interface ReceiptData {
  shopName: string; shopAddress: string; shopPhone: string; shopGst: string
  billNumber: string; date: string; cashier?: string
  customer?: { name: string; phone: string; gst?: string }
  items: { name: string; size?: string; qty: number; price: number; discount: number; gstRate: number; total: number }[]
  subtotal: number; discountAmt: number
  gstBreakup: { rate: number; taxable: number; cgst: number; sgst: number }[]
  gstTotal: number; total: number; amountPaid: number; change: number
  paymentMode: string; upiRef?: string; footer: string
}

export function buildReceiptCommands(data: ReceiptData, width: 48 | 32 = 48): Buffer {
  const cmds: number[] = []
  const W = width
  const ESC = 0x1b, GS = 0x1d
  const init        = [ESC, 0x40]
  const alignLeft   = [ESC, 0x61, 0x00]
  const alignCenter = [ESC, 0x61, 0x01]
  const bold        = (on: boolean) => [ESC, 0x45, on ? 1 : 0]
  const dblWidth    = (on: boolean) => [GS, 0x21, on ? 0x11 : 0x00]
  const feed        = (n: number)   => [ESC, 0x64, n]
  const cut         = [GS, 0x56, 0x41, 0x00]
  const LF          = [0x0a]

  const text  = (s: string) => [...Buffer.from(s.replace(/[^\x00-\x7F]/g, '?'), 'ascii')]
  const line  = (s: string) => [...text(s), ...LF]
  const sep   = () => line('-'.repeat(W))
  const dblSep = () => line('='.repeat(W))
  const fmt   = (n: number) => n.toFixed(2)
  const money = (n: number) => `Rs.${fmt(n)}`
  const pad   = (left: string, right: string, w: number = W) => {
    const space = w - left.length - right.length
    return left + ' '.repeat(Math.max(1, space)) + right
  }

  cmds.push(...init, ...alignCenter, ...bold(true), ...dblWidth(true))
  cmds.push(...line(data.shopName.toUpperCase().slice(0, W / 2)))
  cmds.push(...dblWidth(false), ...bold(false))
  cmds.push(...line(data.shopAddress.slice(0, W)))
  if (data.shopPhone) cmds.push(...line(`Ph: ${data.shopPhone}`))
  if (data.shopGst)   cmds.push(...line(`GST: ${data.shopGst}`))
  cmds.push(...feed(1), ...dblSep(), ...alignLeft)
  cmds.push(...line(pad(`Bill: ${data.billNumber}`, `Date: ${data.date}`)))
  if (data.customer) {
    cmds.push(...line(`Cust: ${data.customer.name} | ${data.customer.phone}`))
    if (data.customer.gst) cmds.push(...line(`GST: ${data.customer.gst}`))
  }
  cmds.push(...sep(), ...bold(true))
  cmds.push(...line(`Item${' '.repeat(W - 22)}Qty  Price   Total`))
  cmds.push(...bold(false), ...sep())
  for (const item of data.items) {
    const maxD = W - 18
    const desc = (item.size ? `${item.name}(${item.size})` : item.name).slice(0, maxD)
    cmds.push(...line(desc))
    cmds.push(...line(`    ${pad(String(item.qty), `${fmt(item.price)}  ${fmt(item.total)}`, W - 4)}`))
    if (item.discount > 0) cmds.push(...line(`    Disc: -${fmt(item.discount)}`))
  }
  cmds.push(...sep(), ...alignCenter)
  const sub = money(data.subtotal)
  cmds.push(...alignLeft, ...line(pad('Subtotal:', sub)))
  if (data.discountAmt > 0) cmds.push(...line(pad('Discount:', `-${money(data.discountAmt)}`)))
  cmds.push(...line(pad('GST Total:', money(data.gstTotal))), ...dblSep())
  cmds.push(...bold(true))
  cmds.push(...line(`TOTAL  ${money(data.total)}`))
  cmds.push(...bold(false), ...dblSep())
  cmds.push(...line(pad(`Paid(${data.paymentMode}):`, money(data.amountPaid))))
  if (data.change > 0) cmds.push(...line(pad('Change:', money(data.change))))
  if (data.upiRef)     cmds.push(...line(`UPI: ${data.upiRef}`))
  cmds.push(...sep(), ...alignCenter)
  cmds.push(...line('-- GST Breakup --'), ...alignLeft)
  for (const g of data.gstBreakup) {
    if (g.taxable > 0)
      cmds.push(...line(pad(`${g.rate}%`, `${fmt(g.taxable)}  C:${fmt(g.cgst)}  S:${fmt(g.sgst)}`)))
  }
  cmds.push(...sep(), ...feed(1), ...alignCenter, ...bold(true))
  cmds.push(...line(data.footer.slice(0, W)))
  cmds.push(...bold(false), ...line('Goods once sold not returned'))
  cmds.push(...feed(3), ...cut)
  return Buffer.from(cmds)
}

// Network thermal printer (LAN/WiFi) — no extra install needed
export async function printReceiptNetwork(data: ReceiptData, ip: string, port: number = 9100): Promise<void> {
  const net = await import('net')
  const buf = buildReceiptCommands(data)
  return new Promise<void>((res, rej) => {
    const client = net.createConnection(port, ip, () => {
      client.write(buf, (err) => {
        if (err) { client.destroy(); rej(err) }
        else { client.end(); res() }
      })
    })
    client.setTimeout(5000)
    client.on('error', rej)
    client.on('timeout', () => { client.destroy(); rej(new Error('Printer timeout')) })
  })
}

// USB thermal printer — requires: npm install serialport  (optional)
export async function printReceiptUSB(data: ReceiptData, port: string = '/dev/usb/lp0'): Promise<void> {
  let SerialPort: any
  try {
    const sp = require('serialport')
    SerialPort = sp.SerialPort || sp.default?.SerialPort || sp
  } catch {
    throw new Error(
      'USB printing requires serialport.\nRun: npm install serialport\nOr use Network mode in Settings.'
    )
  }
  const buf = buildReceiptCommands(data)
  const sp = new SerialPort({ path: port, baudRate: 9600 })
  return new Promise<void>((res, rej) => {
    sp.write(buf, (err: any) => {
      if (err) { sp.close(); rej(err) }
      else sp.drain(() => { sp.close(); res() })
    })
  })
}

export function getReceiptBase64(data: ReceiptData): string {
  return buildReceiptCommands(data).toString('base64')
}
