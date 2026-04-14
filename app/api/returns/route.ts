import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// Generate return number
async function generateReturnNumber() {
  const count = await prisma.return.count()
  const date = new Date()
  const d = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
  return `RET${d}${String(count+1).padStart(4,'0')}`
}

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get('from')
    const to   = req.nextUrl.searchParams.get('to')
    const returns = await prisma.return.findMany({
      where: from && to ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {},
      include: { bill: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(returns)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'No items to return' }, { status: 400 })
    }

    const returnNumber = await generateReturnNumber()

    // Create return record
    const ret = await prisma.return.create({
      data: {
        returnNumber,
        billId:       body.billId  || null,
        reason:       body.reason  || null,
        notes:        body.notes   || null,
        refundAmount: parseFloat(body.refundAmount) || 0,
        refundMode:   body.refundMode || 'CASH',
        status:       'COMPLETED',
        items: {
          create: body.items.map((i: any) => ({
            productId: i.productId && !String(i.productId).startsWith('manual') ? i.productId : null,
            name:      i.name,
            barcode:   i.barcode || 'UNKNOWN',
            qty:       parseInt(i.qty) || 1,
            salePrice: parseFloat(i.salePrice) || 0,
            gstRate:   parseFloat(i.gstRate)   || 0,
            gstAmount: parseFloat(i.gstAmount) || 0,
            total:     parseFloat(i.total)     || 0,
          }))
        }
      },
      include: { items: true }
    })

    // ✅ Update stock — add back returned quantities
    for (const item of body.items) {
      if (item.productId && !String(item.productId).startsWith('manual')) {
        await prisma.product.update({
          where: { id: item.productId },
          data:  { stock: { increment: parseInt(item.qty) || 1 } }
        }).catch(e => console.warn('Stock update failed for', item.productId, e.message))
      }
    }

    // If linked to a bill, update bill status
    if (body.billId) {
      await prisma.bill.update({
        where: { id: body.billId },
        data:  { status: 'RETURNED', notes: `Return: ${returnNumber}` }
      }).catch(() => {})
    }

    return NextResponse.json({ ...ret, returnNumber }, { status: 201 })
  } catch (e: any) {
    console.error('Return error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
