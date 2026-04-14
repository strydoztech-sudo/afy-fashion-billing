// app/api/seed/route.ts
// ONE-TIME USE: Visit /api/seed?key=afy2024 after first deploy to seed database
// Delete this file after seeding!

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

const SEED_KEY = process.env.SEED_KEY || 'afy2024'
const hash = (p: string) => createHash('sha256').update(p).digest('hex')

export async function GET(req: NextRequest) {
  // Security check
  const key = req.nextUrl.searchParams.get('key')
  if (key !== SEED_KEY) {
    return NextResponse.json({ error: 'Invalid seed key. Use ?key=afy2024' }, { status: 401 })
  }

  try {
    const results: string[] = []

    // Settings
    const settings = [
      { key: 'shop_name',            value: 'AFY Fashion' },
      { key: 'shop_address',         value: '123, Main Street, Chennai - 600001' },
      { key: 'shop_phone',           value: '9876543210' },
      { key: 'shop_gst',             value: '33ABCDE1234F1Z5' },
      { key: 'receipt_footer',       value: 'Thank you! Developed by www.strydoz.in' },
      { key: 'currency',             value: '₹' },
      { key: 'thermal_printer_type', value: 'network' },
      { key: 'thermal_printer_ip',   value: '192.168.1.100' },
      { key: 'label_printer_type',   value: 'network' },
      { key: 'label_printer_ip',     value: '192.168.1.101' },
      { key: 'bill_prefix',          value: 'AFY' },
      { key: 'gst_enabled',          value: 'true' },
    ]
    for (const s of settings) {
      await prisma.setting.upsert({ where:{key:s.key}, update:{value:s.value}, create:s })
    }
    results.push('✅ Settings created')

    // Categories
    const cats = ['Jeans','Shirt','T-Shirt','Kurti','Saree','Legging','Dress','Trouser','Frock','Shorts','Jacket','Other']
    for (const name of cats) {
      await prisma.category.upsert({ where:{name}, update:{}, create:{name} })
    }
    results.push('✅ Categories created: ' + cats.join(', '))

    // Users
    const existingAdmin = await prisma.user.findUnique({ where:{username:'admin'} })
    if (!existingAdmin) {
      await prisma.user.create({ data:{username:'admin', password:hash('admin123'), name:'Admin', role:'admin', active:true} })
      results.push('✅ Admin user created (admin / admin123)')
    } else {
      results.push('ℹ️ Admin user already exists')
    }
    const existingCashier = await prisma.user.findUnique({ where:{username:'cashier'} })
    if (!existingCashier) {
      await prisma.user.create({ data:{username:'cashier', password:hash('cash123'), name:'Cashier', role:'cashier', active:true} })
      results.push('✅ Cashier user created (cashier / cash123)')
    } else {
      results.push('ℹ️ Cashier user already exists')
    }

    // Sample products
    const products = [
      { barcode:'8901030874544', name:'Men Slim Fit Jeans Blue',    category:'Jeans',   size:'32',   color:'Blue',   costPrice:350, purchaseRate:450, mrp:1299, salePrice:999,  gstRate:5, stock:15 },
      { barcode:'8901030874545', name:'Men Slim Fit Jeans Black',   category:'Jeans',   size:'32',   color:'Black',  costPrice:350, purchaseRate:450, mrp:1299, salePrice:999,  gstRate:5, stock:10 },
      { barcode:'8901030874546', name:'Women Kurti Floral Print',   category:'Kurti',   size:'M',    color:'Red',    costPrice:200, purchaseRate:280, mrp:899,  salePrice:699,  gstRate:5, stock:20 },
      { barcode:'8901030874547', name:'Men Formal Shirt White',     category:'Shirt',   size:'L',    color:'White',  costPrice:400, purchaseRate:550, mrp:1499, salePrice:1199, gstRate:5, stock:8  },
      { barcode:'8901030874548', name:'Kids T-Shirt Graphic Print', category:'T-Shirt', size:'8Y',   color:'Yellow', costPrice:120, purchaseRate:180, mrp:499,  salePrice:399,  gstRate:5, stock:25 },
    ]
    let prodCount = 0
    for (const p of products) {
      const ex = await prisma.product.findUnique({ where:{barcode:p.barcode} })
      if (!ex) { await prisma.product.create({data:p}); prodCount++ }
    }
    results.push(`✅ ${prodCount} sample products created`)

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully! Delete /app/api/seed/ folder after this.',
      results,
      login: { admin: 'admin / admin123', cashier: 'cashier / cash123' }
    })
  } catch (e: any) {
    console.error('Seed error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
