import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const customers = await prisma.customer.findMany({
    where: q ? {
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ]
    } : {},
    include: { _count: { select: { bills: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  try {
    const customer = await prisma.customer.create({ data })
    return NextResponse.json(customer, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
