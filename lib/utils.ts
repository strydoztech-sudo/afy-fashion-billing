// lib/utils.ts
import { prisma } from './db/prisma'

export async function generateBillNumber(): Promise<string> {
  const prefix = await prisma.setting.findUnique({ where: { key: 'bill_prefix' } })
  const p = prefix?.value ?? 'AFY'
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const count = await prisma.bill.count({
    where: { createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } }
  })
  return `${p}${dateStr}${String(count + 1).padStart(4, '0')}`
}

export async function getSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany()
  return Object.fromEntries(settings.map(s => [s.key, s.value]))
}

export function calcGST(amount: number, rate: number) {
  const gstAmt = (amount * rate) / (100 + rate)
  const taxable = amount - gstAmt
  return { taxable, gstAmt, cgst: gstAmt / 2, sgst: gstAmt / 2 }
}

export function formatCurrency(n: number) {
  return `₹${n.toFixed(2)}`
}

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(d: Date | string) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(d: Date | string) {
  return `${formatDate(d)} ${formatTime(d)}`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
