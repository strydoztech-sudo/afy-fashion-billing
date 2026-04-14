import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hash(p: string) {
  return createHash('sha256').update(p).digest('hex')
}

async function main() {
  console.log('🌱 Starting seed...')

  // ── Settings ──
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
    { key: 'developer',            value: 'www.strydoz.in' },
  ]
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key }, update: { value: s.value }, create: s
    })
  }
  console.log('✅ Settings seeded')

  // ── Default Categories ──
  const cats = ['Jeans','Shirt','T-Shirt','Kurti','Saree','Legging','Dress','Trouser','Frock','Shorts','Jacket','Other']
  for (const name of cats) {
    await prisma.category.upsert({
      where: { name }, update: {}, create: { name }
    })
  }
  console.log('✅ Categories seeded')

  // ── Default Users ──
  const users = [
    { username: 'admin',   password: hash('admin123'),  name: 'Admin',   role: 'admin' },
    { username: 'cashier', password: hash('cash123'),   name: 'Cashier', role: 'cashier' },
  ]
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username }, update: {}, create: { ...u, active: true }
    })
  }
  console.log('✅ Users seeded')

  // ── Sample Products ──
  const products = [
    { barcode:'8901030874544', name:'Men Slim Fit Jeans Blue',    category:'Jeans',   size:'32',   color:'Blue',   costPrice:350, purchaseRate:450, mrp:1299, salePrice:999,  gstRate:5, stock:15 },
    { barcode:'8901030874545', name:'Men Slim Fit Jeans Black',   category:'Jeans',   size:'32',   color:'Black',  costPrice:350, purchaseRate:450, mrp:1299, salePrice:999,  gstRate:5, stock:10 },
    { barcode:'8901030874546', name:'Women Kurti Floral Print',   category:'Kurti',   size:'M',    color:'Red',    costPrice:200, purchaseRate:280, mrp:899,  salePrice:699,  gstRate:5, stock:20 },
    { barcode:'8901030874547', name:'Men Formal Shirt White',     category:'Shirt',   size:'L',    color:'White',  costPrice:400, purchaseRate:550, mrp:1499, salePrice:1199, gstRate:5, stock:8  },
    { barcode:'8901030874548', name:'Kids T-Shirt Graphic Print', category:'T-Shirt', size:'8Y',   color:'Yellow', costPrice:120, purchaseRate:180, mrp:499,  salePrice:399,  gstRate:5, stock:25 },
    { barcode:'8901030874549', name:'Women Legging Cotton',       category:'Legging', size:'Free', color:'Black',  costPrice:80,  purchaseRate:130, mrp:399,  salePrice:299,  gstRate:5, stock:30 },
    { barcode:'8901030874550', name:'Men Polo T-Shirt Navy',      category:'T-Shirt', size:'XL',   color:'Navy',   costPrice:200, purchaseRate:290, mrp:799,  salePrice:649,  gstRate:5, stock:12 },
    { barcode:'8901030874551', name:'Women Saree Cotton Silk',    category:'Saree',   size:'Free', color:'Green',  costPrice:700, purchaseRate:950, mrp:2499, salePrice:1999, gstRate:5, stock:6  },
  ]
  for (const p of products) {
    await prisma.product.upsert({
      where: { barcode: p.barcode }, update: p, create: p
    })
  }
  console.log('✅ Products seeded')

  console.log('')
  console.log('🎉 Seed complete!')
  console.log('👤 Login: admin / admin123')
  console.log('👤 Login: cashier / cash123')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
