import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const settings = await prisma.setting.findMany()
  return NextResponse.json(Object.fromEntries(settings.map(s => [s.key, s.value])))
}

export async function POST(req: NextRequest) {
  const data: Record<string, string> = await req.json()
  for (const [key, value] of Object.entries(data)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }
  return NextResponse.json({ ok: true })
}
