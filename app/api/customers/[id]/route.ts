import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const customer = await prisma.customer.update({ where: { id: params.id }, data })
  return NextResponse.json(customer)
}
