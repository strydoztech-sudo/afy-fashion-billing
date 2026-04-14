import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSettings, calcGST, formatDate } from '@/lib/utils'
import { printReceiptNetwork, printReceiptUSB, type ReceiptData } from '@/lib/printer/thermal'

export async function POST(req: NextRequest) {
  try {
    const { billId } = await req.json()
    const [bill, settings] = await Promise.all([
      prisma.bill.findUnique({
        where: { id: billId },
        include: { customer: true, items: { include: { product: true } } }
      }),
      getSettings()
    ])
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    const gstMap: Record<number, { taxable: number; cgst: number; sgst: number }> = {}
    for (const item of bill.items) {
      const g = calcGST(item.total, item.gstRate)
      if (!gstMap[item.gstRate]) gstMap[item.gstRate] = { taxable: 0, cgst: 0, sgst: 0 }
      gstMap[item.gstRate].taxable += g.taxable
      gstMap[item.gstRate].cgst   += g.cgst
      gstMap[item.gstRate].sgst   += g.sgst
    }

    const receiptData: ReceiptData = {
      shopName:    settings.shop_name    || 'AFY Fashion',
      shopAddress: settings.shop_address || '',
      shopPhone:   settings.shop_phone   || '',
      shopGst:     settings.shop_gst     || '',
      billNumber:  bill.billNumber,
      date:        formatDate(bill.createdAt),
      customer:    bill.customer
        ? { name: bill.customer.name, phone: bill.customer.phone, gst: bill.customer.gstNumber || undefined }
        : undefined,
      items: bill.items.map(i => ({
        name: i.name, size: i.size || undefined,
        qty: i.qty, price: i.salePrice,
        discount: i.discount, gstRate: i.gstRate, total: i.total
      })),
      subtotal:    bill.subtotal,
      discountAmt: bill.discountAmt,
      gstBreakup:  Object.entries(gstMap).map(([rate, v]) => ({ rate: parseFloat(rate), ...v })),
      gstTotal:    bill.gstAmount,
      total:       bill.totalAmount,
      amountPaid:  bill.amountPaid,
      change:      bill.changeAmount,
      paymentMode: bill.paymentMode,
      upiRef:      bill.upiRef || undefined,
      footer:      settings.receipt_footer || 'Thank you!'
    }

    const printerType = settings.thermal_printer_type || 'network'
    try {
      if (printerType === 'network') {
        await printReceiptNetwork(receiptData, settings.thermal_printer_ip || '192.168.1.100')
      } else {
        await printReceiptUSB(receiptData, settings.thermal_printer_port || '/dev/usb/lp0')
      }
      await prisma.bill.update({ where: { id: billId }, data: { printedAt: new Date() } })
      return NextResponse.json({ ok: true })
    } catch (printerErr: any) {
      // Printer failed — still mark as attempted
      console.error('Printer error:', printerErr.message)
      return NextResponse.json({
        ok: false,
        printerError: printerErr.message,
        hint: 'Check printer connection in Settings page'
      }, { status: 200 }) // 200 so client can show friendly message
    }
  } catch (err: any) {
    console.error('Thermal print route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
