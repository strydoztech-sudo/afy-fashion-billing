import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const barcode = req.nextUrl.searchParams.get('barcode')
    if (barcode) {
      const product = await prisma.product.findUnique({ where: { barcode } })
      if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(product)
    }
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(products)
  } catch (e: any) {
    console.error('GET products error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const product = await prisma.product.create({
      data: {
        barcode:      String(data.barcode).trim(),
        name:         String(data.name).trim(),
        category:     String(data.category || 'Other'),
        size:         data.size  ? String(data.size)  : null,
        color:        data.color ? String(data.color) : null,
        costPrice:    parseFloat(data.costPrice)    || 0,
        purchaseRate: parseFloat(data.purchaseRate) || 0,
        mrp:          parseFloat(data.mrp),
        salePrice:    parseFloat(data.salePrice),
        gstRate:      data.gstRate !== undefined && data.gstRate !== '' ? parseFloat(data.gstRate) : 0,
        stock:        parseInt(data.stock)           || 0,
        unit:         data.unit || 'PCS',
      }
    })
    return NextResponse.json(product, { status: 201 })
  } catch (e: any) {
    console.error('POST product error:', e)
    if (e.code === 'P2002') return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
