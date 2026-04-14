import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

function hash(p: string) { return createHash('sha256').update(p).digest('hex') }

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id:true, username:true, name:true, role:true, active:true, createdAt:true },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json(users)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, name, role } = await req.json()
    if (!username?.trim()) return NextResponse.json({ error: 'Username required' }, { status: 400 })
    if (!password || password.length < 4) return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const user = await prisma.user.create({
      data: { username: username.trim().toLowerCase(), password: hash(password), name: name.trim(), role: role || 'cashier', active: true },
      select: { id:true, username:true, name:true, role:true, active:true, createdAt:true }
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, role, active, newPassword } = await req.json()
    const data: any = { name, role, active }
    if (newPassword && newPassword.length >= 4) data.password = hash(newPassword)
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id:true, username:true, name:true, role:true, active:true }
    })
    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
