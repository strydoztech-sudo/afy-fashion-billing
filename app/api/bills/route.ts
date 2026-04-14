import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generateBillNumber } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const from   = req.nextUrl.searchParams.get('from')
    const to     = req.nextUrl.searchParams.get('to')
    const search = req.nextUrl.searchParams.get('search')

    let where: any = {}
    if (search) {
      where = { billNumber: { contains: search } }
    } else if (from && to) {
      where = { createdAt: { gte: new Date(from), lte: new Date(to) } }
    }

    const bills = await prisma.bill.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(bills)
  } catch (e: any) {
    console.error('GET bills error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'No items in bill' }, { status: 400 })
    }

    const billNumber = await generateBillNumber()

    // Separate DB products from manual entries
    const dbItems     = body.items.filter((i: any) => i.barcode !== 'MANUAL' && !String(i.id).startsWith('manual-'))
    const manualItems = body.items.filter((i: any) => i.barcode === 'MANUAL' || String(i.id).startsWith('manual-'))

    // Find a valid productId for manual items (use first DB product as placeholder, or skip relation)
    const billItemsData = await Promise.all(body.items.map(async (i: any) => {
      const isManual = i.barcode === 'MANUAL' || String(i.id).startsWith('manual-')
      const disc     = i.disc ?? i.discount ?? 0
      const total    = i.salePrice * i.qty * (1 - disc / 100)
      const gstRate  = parseFloat(i.gstRate) || 0
    const gstAmt   = gstRate > 0 ? (total * gstRate) / (100 + gstRate) : 0

      if (isManual) {
        // Manual item — no productId relation needed, store as standalone
        return {
          // We'll create without productId by using a workaround
          _isManual: true,
          name:      String(i.name).trim(),
          barcode:   'MANUAL',
          size:      null,
          color:     null,
          qty:       parseInt(i.qty) || 1,
          mrp:       parseFloat(i.mrp) || parseFloat(i.salePrice) || 0,
          salePrice: parseFloat(i.salePrice) || 0,
          discount:  disc,
          gstRate:   gstRate,
          gstAmount: gstAmt,
          total,
        }
      } else {
        // DB product — verify product exists
        const product = await prisma.product.findUnique({ where: { id: i.id } }).catch(() => null)
        if (!product) {
          // Product not found — treat as manual
          return {
            _isManual: true,
            name:      i.name, barcode: i.barcode || 'UNKNOWN',
            size: null, color: null,
            qty: parseInt(i.qty)||1, mrp: parseFloat(i.mrp)||0,
            salePrice: parseFloat(i.salePrice)||0, discount: disc,
            gstRate: parseFloat(i.gstRate)||0, gstAmount: gstAmt, total,
          }
        }
        return {
          _isManual: false,
          productId: product.id,
          name:      i.name || product.name,
          barcode:   i.barcode || product.barcode,
          size:      i.size  || product.size  || null,
          color:     i.color || product.color || null,
          qty:       parseInt(i.qty) || 1,
          mrp:       parseFloat(i.mrp) || product.mrp,
          salePrice: parseFloat(i.salePrice) || product.salePrice,
          discount:  disc,
          gstRate:   parseFloat(i.gstRate) || product.gstRate,
          gstAmount: gstAmt,
          total,
        }
      }
    }))

    // Create bill
    const bill = await prisma.bill.create({
      data: {
        billNumber,
        customerId:   body.customerId || null,
        subtotal:     parseFloat(body.subtotal)    || 0,
        discountAmt:  parseFloat(body.discountAmt) || 0,
        discountPct:  parseFloat(body.discountPct) || 0,
        gstAmount:    parseFloat(body.gstAmount)   || 0,
        totalAmount:  parseFloat(body.totalAmount) || 0,
        amountPaid:   parseFloat(body.amountPaid)  || 0,
        changeAmount: parseFloat(body.changeAmount)|| 0,
        paymentMode:  body.paymentMode || 'CASH',
        upiRef:       body.upiRef || null,
        status:       'PAID',
      },
    })

    // Create bill items separately (handle manual vs DB items)
    for (const item of billItemsData) {
      const { _isManual, ...itemData } = item as any
      if (_isManual) {
        // Manual item — create without productId
        await prisma.billItem.create({
          data: { billId: bill.id, productId: await getPlaceholderProductId(), ...itemData }
        }).catch(async () => {
          // If no products exist at all, skip the relation
          console.warn('Could not create bill item for manual entry:', itemData.name)
        })
      } else {
        await prisma.billItem.create({ data: { billId: bill.id, ...itemData } })
      }
    }

    // Reduce stock for DB products only
    for (const item of body.items) {
      if (item.barcode !== 'MANUAL' && !String(item.id).startsWith('manual-')) {
        await prisma.product.update({
          where: { id: item.id },
          data:  { stock: { decrement: parseInt(item.qty) || 1 } }
        }).catch(() => {})
      }
    }

    // Return full bill
    const fullBill = await prisma.bill.findUnique({
      where: { id: bill.id },
      include: { customer: true, items: true }
    })

    return NextResponse.json(fullBill, { status: 201 })
  } catch (e: any) {
    console.error('POST bill error:', e)
    return NextResponse.json({ error: e.message || 'Failed to save bill' }, { status: 500 })
  }
}

// Get any product ID to use as placeholder for manual items
async function getPlaceholderProductId(): Promise<string> {
  const p = await prisma.product.findFirst()
  if (p) return p.id
  throw new Error('No products in database — add at least one product first')
}
