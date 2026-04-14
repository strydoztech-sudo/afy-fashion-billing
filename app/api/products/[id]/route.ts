import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({ where: { id: params.id } })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const product = await prisma.product.update({
      where: { id: params.id },
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
    return NextResponse.json(product)
  } catch (e: any) {
    console.error('PUT product error:', e)
    if (e.code === 'P2002') return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.product.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
