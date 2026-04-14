'use client'
import { useState, useEffect, useRef } from 'react'
import AppLayout from '../AppLayout'

interface Product {
  id:string; barcode:string; name:string; category:string
  size?:string; color?:string; mrp:number; salePrice:number; stock:number
}

function BarcodeCanvas({ value, width=220, height=70 }: { value:string; width?:number; height?:number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current || !value) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height)
    const bars: number[] = [3]
    for (let i=0;i<value.length;i++) {
      const c = value.charCodeAt(i)
      bars.push(1+(c%3),1+((c>>2)%3),1+((c>>4)%2),1+((c>>5)%3))
    }
    bars.push(2,1,3)
    const total = bars.reduce((a,b)=>a+b,0)
    const scale = (width-20)/total
    let x=10; ctx.fillStyle='#000'
    bars.forEach((w,i) => { if(i%2===0) ctx.fillRect(x,4,w*scale,height-22); x+=w*scale })
    ctx.font='11px monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'
    ctx.fillText(value, width/2, height-6)
  }, [value, width, height])
  return <canvas ref={ref} width={width} height={height} style={{display:'block'}}/>
}

export default function BarcodeGeneratorPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product|null>(null)
  const [qty, setQty]           = useState(1)
  const [search, setSearch]     = useState('')
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/products').then(r=>r.json()).then(setProducts).catch(()=>{})
  }, [])

  const flash = (m:string, t:'ok'|'err'='ok') => {
    setMsg(m); setMsgType(t); setTimeout(()=>setMsg(''),3500)
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q)
  })

  const printLabels = () => {
    if (!selected) return
    const printWin = window.open('','_blank','width=800,height=600')!
    const labels = Array(qty).fill(null).map((_,i) => `
      <div style="width:200px;border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:5px;display:inline-block;vertical-align:top">
        <div style="background:#e11d4a;color:white;text-align:center;font-size:10px;font-weight:bold;padding:4px;font-family:sans-serif">AFY FASHION</div>
        <div style="padding:6px 8px;font-family:sans-serif">
          <div style="font-size:10px;font-weight:bold;margin-bottom:2px">${selected.name.length>28?selected.name.slice(0,27)+'.':selected.name}</div>
          ${selected.size?`<div style="font-size:9px;color:#666">Size: ${selected.size}</div>`:''}
          <div style="text-align:center;margin:4px 0">
            <svg id="bc${i}" width="180" height="50"></svg>
          </div>
          <div style="font-size:9px;font-family:monospace;text-align:center;color:#444">${selected.barcode}</div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;align-items:center">
            <span style="font-size:9px;color:#999;text-decoration:line-through">MRP ₹${selected.mrp}</span>
            <span style="font-size:13px;font-weight:bold;color:#e11d4a">₹${selected.salePrice}</span>
          </div>
        </div>
      </div>`).join('')

    printWin.document.write(`
      <html><head><title>Barcode Labels - ${selected.name}</title>
      <style>@media print{body{margin:0}}</style></head>
      <body style="background:#fff;padding:10px">
        <div style="margin-bottom:12px;font-family:sans-serif;font-size:13px;font-weight:bold">
          AFY Fashion — Barcode Labels (${qty}x) — ${selected.name}
        </div>
        <div>${labels}</div>
        <script>
          // Draw barcodes
          const v="${selected.barcode}";
          document.querySelectorAll('[id^=bc]').forEach(svg=>{
            const ns='http://www.w3.org/2000/svg';
            const bars=[3];
            for(let i=0;i<v.length;i++){const c=v.charCodeAt(i);bars.push(1+(c%3),1+((c>>2)%3),1+((c>>4)%2),1+((c>>5)%3))}
            bars.push(2,1,3);
            const total=bars.reduce((a,b)=>a+b,0);
            const scale=160/total;
            let x=10;
            bars.forEach((w,i)=>{
              if(i%2===0){const r=document.createElementNS(ns,'rect');r.setAttribute('x',x);r.setAttribute('y','2');r.setAttribute('width',w*scale);r.setAttribute('height','36');r.setAttribute('fill','#000');svg.appendChild(r)}
              x+=w*scale;
            });
          });
          setTimeout(()=>window.print(),500);
        <\/script>
      </body></html>`)
    printWin.document.close()
    flash(`🖨️ Printing ${qty} label(s) for ${selected.name}`)
  }

  const sendToPrinter = async () => {
    if (!selected) return
    try {
      const r = await fetch('/api/print/barcode', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({productId:selected.id, qty})
      })
      flash(r.ok?`🖨️ ${qty} label(s) sent to label printer!`:'❌ Printer error', r.ok?'ok':'err')
    } catch { flash('❌ Printer connection failed','err') }
  }

  const downloadPDF = async () => {
    if (!selected) return
    try {
      const r = await fetch('/api/print/barcode', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({productId:selected.id, qty, mode:'pdf'})
      })
      if (r.ok) {
        const {pdf} = await r.json()
        const a = document.createElement('a')
        a.href = 'data:application/pdf;base64,'+pdf
        a.download = `label-${selected.barcode}.pdf`
        a.click()
        flash('✅ PDF downloaded!')
      } else flash('❌ PDF generation failed','err')
    } catch { flash('❌ Error generating PDF','err') }
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Barcode Generator</h1>
          <p className="text-sm text-gray-500">Generate and print barcode labels for your products</p>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium border ${
            msgType==='ok'?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-800'
          }`}>{msg}</div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* LEFT: Product selector */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">1. Select Product</h2>
            <input type="text" placeholder="🔍 Search product name or barcode..."
              value={search} onChange={e=>setSearch(e.target.value)} className="input"/>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              {filtered.length===0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No products found</div>
              ) : filtered.map(p=>(
                <div key={p.id} onClick={()=>setSelected(p)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${
                    selected?.id===p.id?'bg-brand-50 border-l-4 border-l-brand-500':'hover:bg-gray-50'
                  }`}>
                  <div className="font-medium text-sm text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-400 flex gap-3 mt-0.5">
                    <span className="font-mono">{p.barcode}</span>
                    <span>{p.category}{p.size&&` · ${p.size}`}</span>
                    <span className="font-semibold text-brand-600">₹{p.salePrice}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="label">Number of Labels</label>
              <div className="flex items-center gap-3">
                <button onClick={()=>setQty(q=>Math.max(1,q-1))}
                  className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 font-bold text-lg hover:bg-gray-100">−</button>
                <input type="number" min={1} max={500} value={qty}
                  onChange={e=>setQty(parseInt(e.target.value)||1)}
                  className="input text-center font-bold text-lg w-24"/>
                <button onClick={()=>setQty(q=>q+1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 font-bold text-lg hover:bg-gray-100">+</button>
              </div>
              <div className="flex gap-2 mt-2">
                {[1,5,10,25,50].map(n=>(
                  <button key={n} onClick={()=>setQty(n)}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
                      qty===n?'bg-brand-600 text-white border-brand-600':'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
                    }`}>{n}</button>
                ))}
              </div>
            </div>

            {selected && (
              <div className="space-y-2 pt-2">
                <button onClick={printLabels}
                  className="w-full btn-primary py-2.5 justify-center">
                  🖨️ Print {qty} Label{qty>1?'s':''} (Browser)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={sendToPrinter}
                    className="btn-secondary py-2 justify-center text-sm">
                    🏷️ Send to Label Printer
                  </button>
                  <button onClick={downloadPDF}
                    className="btn-secondary py-2 justify-center text-sm">
                    ⬇️ Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Preview */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">2. Label Preview</h2>
            {selected ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  {/* Label card */}
                  <div className="border-2 border-gray-300 rounded-xl overflow-hidden" style={{width:220}}>
                    <div className="bg-brand-600 text-white text-center text-xs font-bold py-2 tracking-wider">
                      AFY FASHION
                    </div>
                    <div className="px-4 py-3 bg-white">
                      <div className="text-xs font-bold text-gray-900 mb-0.5 truncate">{selected.name}</div>
                      {selected.size && <div className="text-xs text-gray-500 mb-1">Size: {selected.size}</div>}
                      <div className="flex justify-center my-2">
                        <BarcodeCanvas value={selected.barcode} width={194} height={60}/>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div>
                          <span className="text-xs text-gray-400 line-through">MRP ₹{selected.mrp}</span>
                        </div>
                        <span className="text-base font-bold text-brand-600">₹{selected.salePrice}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product info */}
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">Product:</span> <span className="font-medium">{selected.name}</span></div>
                    <div><span className="text-gray-500">Barcode:</span> <span className="font-mono font-medium">{selected.barcode}</span></div>
                    <div><span className="text-gray-500">Category:</span> <span className="font-medium">{selected.category}</span></div>
                    {selected.size&&<div><span className="text-gray-500">Size:</span> <span className="font-medium">{selected.size}</span></div>}
                    <div><span className="text-gray-500">MRP:</span> <span className="font-medium">₹{selected.mrp}</span></div>
                    <div><span className="text-gray-500">Sale Price:</span> <span className="font-bold text-brand-600">₹{selected.salePrice}</span></div>
                    <div><span className="text-gray-500">Stock:</span> <span className="font-medium">{selected.stock}</span></div>
                    <div><span className="text-gray-500">Printing:</span> <span className="font-bold text-blue-600">{qty} label{qty>1?'s':''}</span></div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  <strong>Label size:</strong> 50mm × 30mm (compatible with Zebra, TSC, Godex printers)
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="text-5xl mb-3">🔢</div>
                <p className="text-sm font-medium text-gray-400">Select a product to preview</p>
                <p className="text-xs text-gray-300 mt-1">Click any product from the list</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick print table */}
        {products.length>0 && (
          <div className="card mt-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Quick Print — All Products</h2>
              <span className="text-xs text-gray-400">Set qty and click 🖨️ to print that product's labels instantly</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Barcode</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p=>(
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.category}{p.size&&` · ${p.size}`}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.barcode}</td>
                    <td className="px-4 py-3 text-right font-semibold text-xs">₹{p.salePrice}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{p.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <input type="number" min={1} max={500}
                        defaultValue={1} id={`qty-${p.id}`}
                        className="w-14 text-center border border-gray-200 rounded text-xs py-1"/>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={()=>{
                        setSelected(p)
                        const q=parseInt((document.getElementById(`qty-${p.id}`) as HTMLInputElement)?.value||'1')||1
                        setQty(q)
                        // Print inline
                        const printWin=window.open('','_blank','width=800,height=600')!
                        const labs=Array(q).fill(null).map((_,i)=>`
                          <div style="width:200px;border:1px solid #ddd;border-radius:8px;overflow:hidden;margin:4px;display:inline-block;vertical-align:top">
                            <div style="background:#e11d4a;color:white;text-align:center;font-size:10px;font-weight:bold;padding:3px;font-family:sans-serif">AFY FASHION</div>
                            <div style="padding:5px 7px;font-family:sans-serif">
                              <div style="font-size:9px;font-weight:bold">${p.name.length>28?p.name.slice(0,27)+'.':p.name}</div>
                              ${p.size?`<div style="font-size:8px;color:#666">Sz: ${p.size}</div>`:''}
                              <svg id="bc${i}" width="180" height="44"></svg>
                              <div style="font-size:8px;font-family:monospace;text-align:center">${p.barcode}</div>
                              <div style="display:flex;justify-content:space-between;margin-top:2px">
                                <span style="font-size:8px;color:#999;text-decoration:line-through">₹${p.mrp}</span>
                                <span style="font-size:12px;font-weight:bold;color:#e11d4a">₹${p.salePrice}</span>
                              </div>
                            </div>
                          </div>`).join('')
                        printWin.document.write(`<html><head><title>Labels</title></head><body style="padding:8px">${labs}<script>
                          const v="${p.barcode}";
                          document.querySelectorAll('[id^=bc]').forEach(svg=>{
                            const ns='http://www.w3.org/2000/svg';const bars=[3];
                            for(let i=0;i<v.length;i++){const c=v.charCodeAt(i);bars.push(1+(c%3),1+((c>>2)%3),1+((c>>4)%2),1+((c>>5)%3))}
                            bars.push(2,1,3);const total=bars.reduce((a,b)=>a+b,0);const scale=160/total;let x=10;
                            bars.forEach((w,i)=>{if(i%2===0){const r=document.createElementNS(ns,'rect');r.setAttribute('x',x);r.setAttribute('y','2');r.setAttribute('width',w*scale);r.setAttribute('height','30');r.setAttribute('fill','#000');svg.appendChild(r)}x+=w*scale;});
                          });setTimeout(()=>window.print(),400);<\/script></body></html>`)
                        printWin.document.close()
                      }} className="btn-secondary text-xs py-1 px-3">🖨️ Print</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
