import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSettings } from '@/lib/utils'
import { printLabelNetwork, printLabelUSB, buildPDFLabel, type LabelData } from '@/lib/printer/label'

export async function POST(req: NextRequest) {
  try {
    const { productId, qty = 1, mode = 'printer' } = await req.json()
    const [product, settings] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      getSettings()
    ])
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const labelData: LabelData = {
      shopName:    settings.shop_name || 'AFY Fashion',
      productName: product.name,
      barcode:     product.barcode,
      size:        product.size  || undefined,
      color:       product.color || undefined,
      mrp:         product.mrp,
      salePrice:   product.salePrice,
      category:    product.category,
    }

    if (mode === 'pdf') {
      const pdf = await buildPDFLabel(labelData)
      return NextResponse.json({ pdf })
    }

    const labels: LabelData[] = Array(qty).fill(labelData)
    const printerType = settings.label_printer_type || 'network'
    try {
      if (printerType === 'network') {
        await printLabelNetwork(labels, settings.label_printer_ip || '192.168.1.101')
      } else {
        await printLabelUSB(labels, settings.label_printer_port || '/dev/usb/lp1')
      }
      return NextResponse.json({ ok: true, printed: qty })
    } catch (printerErr: any) {
      return NextResponse.json({
        ok: false,
        printerError: printerErr.message,
        hint: 'Check label printer settings'
      }, { status: 200 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
