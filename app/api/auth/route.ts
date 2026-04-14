import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

function hash(p: string) { return createHash('sha256').update(p).digest('hex') }

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !user.active) return NextResponse.json({ error: 'Invalid username' }, { status: 401 })
    if (user.password !== hash(password)) return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    const { password: _, ...safeUser } = user
    return NextResponse.json({ ok: true, user: safeUser })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
