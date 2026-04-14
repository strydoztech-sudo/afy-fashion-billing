import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const bill = await prisma.bill.findUnique({
    where: { id: params.id },
    include: { customer: true, items: { include: { product: true } } }
  })
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(bill)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    // Update bill header only (items are complex - handled separately)
    const bill = await prisma.bill.update({
      where: { id: params.id },
      data: {
        paymentMode:  body.paymentMode,
        amountPaid:   parseFloat(body.amountPaid)   || 0,
        changeAmount: parseFloat(body.changeAmount)  || 0,
        discountAmt:  parseFloat(body.discountAmt)   || 0,
        discountPct:  parseFloat(body.discountPct)   || 0,
        totalAmount:  parseFloat(body.totalAmount)   || 0,
        subtotal:     parseFloat(body.subtotal)      || 0,
        gstAmount:    parseFloat(body.gstAmount)     || 0,
        notes:        body.notes || null,
        status:       body.status || 'PAID',
        upiRef:       body.upiRef || null,
        showGst:      body.showGst !== false,
      },
      include: { customer: true, items: true }
    })
    return NextResponse.json(bill)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    // BillItems deleted by cascade
    await prisma.bill.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
