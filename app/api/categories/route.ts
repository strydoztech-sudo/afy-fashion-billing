import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(cats)
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const cat = await prisma.category.create({ data: { name: name.trim() } })
    return NextResponse.json(cat, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json()
    await prisma.category.delete({ where: { name } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
