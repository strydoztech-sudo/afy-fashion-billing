'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import AppLayout from '../AppLayout'

interface Product {
  id: string; barcode: string; name: string; category: string
  size?: string; color?: string; mrp: number; salePrice: number; gstRate: number; stock: number
}
interface CartItem {
  uid: string; id: string; barcode: string; name: string
  size?: string; color?: string; mrp: number; salePrice: number; gstRate: number
  qty: number; disc: number; gstAmount: number
}
interface Customer { id: string; name: string; phone: string; gstNumber?: string }

const calcGst = (total: number, rate: number) => rate > 0 ? (total * rate) / (100 + rate) : 0
const fmt = (n: number) => `₹${n.toFixed(2)}`

function buildReceiptHTML(bill: any, cartItems: CartItem[], customer: Customer | null, settings: any) {
  const shopName  = settings?.shop_name    || 'AFY Fashion'
  const shopAddr  = settings?.shop_address || ''
  const shopPhone = settings?.shop_phone   || ''
  const shopGst   = settings?.shop_gst     || ''
  const footer    = settings?.receipt_footer || 'Thank you for shopping!'
  const sub       = cartItems.reduce((s,i) => s + i.salePrice*i.qty*(1-i.disc/100), 0)
  const gstTotal  = cartItems.reduce((s,i) => s + i.gstAmount, 0)
  const total     = bill.totalAmount || sub

  const gstMap: Record<number,{taxable:number,cgst:number,sgst:number}> = {}
  cartItems.forEach(i => {
    if (!i.gstRate || i.gstRate <= 0) return
    const t = i.salePrice*i.qty*(1-i.disc/100), g = calcGst(t,i.gstRate)
    if (!gstMap[i.gstRate]) gstMap[i.gstRate]={taxable:0,cgst:0,sgst:0}
    gstMap[i.gstRate].taxable+=t-g; gstMap[i.gstRate].cgst+=g/2; gstMap[i.gstRate].sgst+=g/2
  })

  return `<!DOCTYPE html><html><head><title>Receipt ${bill.billNumber}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:8px}.c{text-align:center}.b{font-weight:bold}.l{border-top:1px dashed #000;margin:5px 0}.dl{border-top:2px solid #000;margin:5px 0}table{width:100%;border-collapse:collapse}@media print{body{margin:0}}</style>
  </head><body>
  <div class="c b" style="font-size:16px">${shopName}</div>
  ${shopAddr?`<div class="c" style="font-size:10px">${shopAddr}</div>`:''}
  ${shopPhone?`<div class="c" style="font-size:10px">Ph: ${shopPhone}</div>`:''}
  ${shopGst?`<div class="c" style="font-size:10px">GSTIN: ${shopGst}</div>`:''}
  <div class="dl"></div>
  <div style="display:flex;justify-content:space-between;font-size:10px">
    <span>Bill: <b>${bill.billNumber}</b></span>
    <span>${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
  </div>
  <div style="font-size:10px">Time: ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
  ${customer?`<div style="font-size:10px">Customer: ${customer.name} | ${customer.phone}</div>`:'<div style="font-size:10px">Customer: Walk-in / Cash</div>'}
  <div class="l"></div>
  <table><thead><tr>
    <th style="text-align:left;font-size:10px">Item</th>
    <th style="text-align:center;font-size:10px;width:28px">Qty</th>
    <th style="text-align:right;font-size:10px;width:52px">Rate</th>
    <th style="text-align:right;font-size:10px;width:56px">Amt</th>
  </tr></thead><tbody>
  ${cartItems.map(i=>{
    const t=i.salePrice*i.qty*(1-i.disc/100)
    return `<tr><td style="font-size:11px;padding:2px 0">${i.name}${i.size?` (${i.size})`:''}</td>
    <td style="text-align:center;font-size:11px">${i.qty}</td>
    <td style="text-align:right;font-size:11px">${i.salePrice.toFixed(2)}</td>
    <td style="text-align:right;font-size:11px;font-weight:bold">${t.toFixed(2)}</td></tr>
    ${i.disc>0?`<tr><td colspan="4" style="font-size:9px;color:#666;padding-left:8px">Disc ${i.disc}% = -${(i.salePrice*i.qty*i.disc/100).toFixed(2)}</td></tr>`:''}`
  }).join('')}
  </tbody></table>
  <div class="l"></div>
  <table>
    <tr><td style="font-size:11px">Subtotal</td><td style="text-align:right;font-size:11px">${sub.toFixed(2)}</td></tr>
    ${(bill.discountAmt||0)>0?`<tr><td style="font-size:11px">Discount</td><td style="text-align:right;font-size:11px;color:#c00">-${(bill.discountAmt).toFixed(2)}</td></tr>`:''}
    ${gstTotal > 0 ? `<tr><td style="font-size:11px">GST (incl.)</td><td style="text-align:right;font-size:11px">${gstTotal.toFixed(2)}</td></tr>` : ''}
  </table>
  <div class="dl"></div>
  <table><tr><td class="b" style="font-size:15px">TOTAL</td><td class="b" style="text-align:right;font-size:15px">Rs.${total.toFixed(2)}</td></tr></table>
  <div class="l"></div>
  <table>
    <tr><td style="font-size:11px">Paid (${bill.paymentMode||'CASH'})</td><td style="text-align:right;font-size:11px">Rs.${(bill.amountPaid||total).toFixed(2)}</td></tr>
    ${(bill.changeAmount||0)>0?`<tr><td style="font-size:11px">Change</td><td style="text-align:right;font-size:11px">Rs.${(bill.changeAmount).toFixed(2)}</td></tr>`:''}
  </table>
  ${Object.keys(gstMap).length>0?`<div class="l"></div>
  <div class="c" style="font-size:9px;font-weight:bold">--- GST Breakup ---</div>
  <table><tr><th style="font-size:9px;text-align:left">Rate</th><th style="text-align:right;font-size:9px">Taxable</th><th style="text-align:right;font-size:9px">CGST</th><th style="text-align:right;font-size:9px">SGST</th></tr>
  ${Object.entries(gstMap).map(([r,v])=>`<tr><td style="font-size:9px">${r}%</td><td style="text-align:right;font-size:9px">${v.taxable.toFixed(2)}</td><td style="text-align:right;font-size:9px">${v.cgst.toFixed(2)}</td><td style="text-align:right;font-size:9px">${v.sgst.toFixed(2)}</td></tr>`).join('')}
  </table>`:''}
  <div class="dl"></div>
  <div class="c b" style="font-size:11px;margin-top:4px">${footer}</div>
  <div class="c" style="font-size:9px">Goods once sold will not be returned</div>
  <br/><br/>
  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),1500)}<\/script>
  </body></html>`
}

export default function BillingPage() {
  const [products, setProducts]       = useState<Product[]>([])
  const [cart, setCart]               = useState<CartItem[]>([])
  const [customer, setCustomer]       = useState<Customer|null>(null)
  const [custSearch, setCustSearch]   = useState('')
  const [custResults, setCustResults] = useState<Customer[]>([])
  const [payMode, setPayMode]         = useState<'CASH'|'UPI'|'CARD'|'SPLIT'>('CASH')
  const [amtPaid, setAmtPaid]         = useState('')
  const [upiRef, setUpiRef]           = useState('')
  const [billDisc, setBillDisc]       = useState(0)
  const [msg, setMsg]                 = useState('')
  const [msgType, setMsgType]         = useState<'ok'|'err'>('ok')
  const [saving, setSaving]           = useState(false)
  const [lastBill, setLastBill]       = useState<any>(null)
  const [lastCart, setLastCart]       = useState<CartItem[]>([])
  const [lastCust, setLastCust]       = useState<Customer|null>(null)
  const [settings, setSettings]       = useState<any>({})

  // ── Entry row (ONE row, no auto-adding) ──
  const [entryName, setEntryName]     = useState('')
  const [entryProd, setEntryProd]     = useState<Product|null>(null)
  const [entryQty, setEntryQty]       = useState(1)
  const [entryDisc, setEntryDisc]     = useState(0)
  const [entryRate, setEntryRate]     = useState('')
  const [acList, setAcList]           = useState<Product[]>([])
  const [acIdx, setAcIdx]             = useState(-1)
  const [showEntry, setShowEntry]     = useState(true)  // always visible - auto row

  // ── Scan bar ──
  const [scanVal, setScanVal]         = useState('')

  // ── Manual panel ──
  const [manualMode, setManualMode]   = useState(false)
  const [manualName, setManualName]   = useState('')
  const [manualRate, setManualRate]   = useState('')
  const [manualQty, setManualQty]     = useState(1)
  const [manualDisc, setManualDisc]   = useState(0)
  const [manualGst, setManualGst]     = useState(5)

  const scanRef  = useRef<HTMLInputElement>(null)
  const nameRef  = useRef<HTMLInputElement>(null)
  const qtyRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/products').then(r=>r.ok?r.json():null).then(d=>d&&setProducts(d)).catch(()=>{})
    fetch('/api/settings').then(r=>r.ok?r.json():null).then(d=>d&&setSettings(d)).catch(()=>{})
  },[])

  const flash = (m:string, t:'ok'|'err'='ok') => {
    setMsg(m); setMsgType(t); setTimeout(()=>setMsg(''),4000)
  }

  // Totals
  const itemSub  = cart.reduce((s,i)=>s+i.salePrice*i.qty*(1-i.disc/100),0)
  const discAmt  = itemSub*billDisc/100
  const total    = itemSub-discAmt
  const gstTotal = cart.reduce((s,i)=>s+i.gstAmount,0)
  const paid     = parseFloat(amtPaid||'0')
  const change   = paid-total

  // ── Add product to cart ──
  const addToCart = useCallback((p:Product, qty=1, disc=0, rateOverride?:number) => {
    const rate     = rateOverride||p.salePrice
    const rowTotal = rate*qty*(1-disc/100)
    const gstAmt   = calcGst(rowTotal, p.gstRate)
    setCart(prev => {
      const ex = prev.find(i=>i.id===p.id&&i.barcode!=='MANUAL')
      if (ex) {
        return prev.map(i=>i.id===p.id&&i.barcode!=='MANUAL'
          ? {...i, qty:i.qty+qty, gstAmount:calcGst(i.salePrice*(i.qty+qty)*(1-i.disc/100),i.gstRate)}
          : i)
      }
      return [...prev, {
        uid:`${p.id}-${Date.now()}`, id:p.id, barcode:p.barcode, name:p.name,
        size:p.size, color:p.color, mrp:p.mrp, salePrice:rate, gstRate:p.gstRate,
        qty, disc, gstAmount:gstAmt
      }]
    })
  },[])

  // ── Barcode scan handler ──
  const handleScanKey = useCallback((e:React.KeyboardEvent<HTMLInputElement>)=>{
    if (e.key!=='Enter') return
    const v = scanVal.trim()
    setScanVal('')
    if (!v) return
    const p = products.find(x=>x.barcode===v)
    if (p) { addToCart(p); flash(`✅ Added: ${p.name}`) }
    else flash(`❌ Barcode not found: ${v}`,'err')
    scanRef.current?.focus()
  },[scanVal,products,addToCart])

  // ── Autocomplete ──
  const onNameType = (v:string) => {
    setEntryName(v); setEntryProd(null); setEntryRate(''); setAcIdx(-1)
    if (!v.trim()) { setAcList([]); return }
    const q = v.toLowerCase()
    setAcList(products.filter(p=>
      p.name.toLowerCase().includes(q)||p.barcode.includes(q)||(p.category||'').toLowerCase().includes(q)
    ).slice(0,8))
  }

  const pickProduct = (p:Product) => {
    setEntryProd(p); setEntryName(p.name); setEntryRate(String(p.salePrice))
    setAcList([]); setEntryQty(1); setEntryDisc(0)
    setTimeout(()=>qtyRef.current?.focus(),30)
  }

  const onNameKey = (e:React.KeyboardEvent) => {
    if (e.key==='ArrowDown') { e.preventDefault(); setAcIdx(i=>Math.min(i+1,acList.length-1)) }
    else if (e.key==='ArrowUp') { e.preventDefault(); setAcIdx(i=>Math.max(i-1,0)) }
    else if ((e.key==='Enter'||e.key==='Tab') && acIdx>=0 && acList[acIdx]) {
      e.preventDefault(); pickProduct(acList[acIdx])
    } else if (e.key==='Escape') setAcList([])
  }

  // ── Commit entry row → cart ──
  const commitEntry = () => {
    if (!entryProd) { flash('⚠️ Select a product from the dropdown first','err'); return }
    const rate = parseFloat(entryRate)||entryProd.salePrice
    addToCart(entryProd, entryQty, entryDisc, rate)
    flash(`✅ ${entryProd.name} × ${entryQty} added`)
    // Reset entry row but KEEP it visible so user can add more
    setEntryName(''); setEntryProd(null); setEntryQty(1); setEntryDisc(0); setEntryRate(''); setAcList([])
    setTimeout(()=>nameRef.current?.focus(),30)
  }

  // ── Manual entry ──
  const commitManual = () => {
    if (!manualName.trim()) { flash('⚠️ Enter item name','err'); return }
    const rate = parseFloat(manualRate)
    if (!rate||rate<=0) { flash('⚠️ Enter valid rate','err'); return }
    const rowTotal = rate*manualQty*(1-manualDisc/100)
    const gstAmt   = calcGst(rowTotal, manualGst)
    setCart(prev=>[...prev,{
      uid:`manual-${Date.now()}`, id:`manual-${Date.now()}`,
      barcode:'MANUAL', name:manualName.trim(),
      mrp:rate, salePrice:rate, gstRate:manualGst,
      qty:manualQty, disc:manualDisc, gstAmount:gstAmt
    }])
    flash(`✅ Manual: ${manualName} × ${manualQty}`)
    setManualName(''); setManualRate(''); setManualQty(1); setManualDisc(0); setManualGst(5)
    setManualMode(false)
  }

  const updateQty = (uid:string,qty:number)=>{
    if(qty<=0){setCart(p=>p.filter(i=>i.uid!==uid));return}
    setCart(p=>p.map(i=>i.uid===uid?{...i,qty,gstAmount:calcGst(i.salePrice*qty*(1-i.disc/100),i.gstRate)}:i))
  }
  const updateDisc = (uid:string,disc:number)=>
    setCart(p=>p.map(i=>i.uid===uid?{...i,disc,gstAmount:calcGst(i.salePrice*i.qty*(1-disc/100),i.gstRate)}:i))

  // ── Customer search ──
  const searchCust = async(q:string)=>{
    setCustSearch(q)
    if(q.length<3){setCustResults([]);return}
    try{const r=await fetch(`/api/customers?q=${encodeURIComponent(q)}`);if(r.ok)setCustResults(await r.json())}catch{}
  }

  // ── Save bill ──
  const saveBillAPI = async()=>{
    // cart already validated by caller
    const payload = {
      customerId:   customer?.id,
      items:        cart.map(i=>({...i, discount:i.disc})),
      subtotal:     itemSub,
      discountAmt:  discAmt,
      discountPct:  billDisc,
      gstAmount:    gstTotal,
      totalAmount:  total,
      amountPaid:   paid||total,
      changeAmount: Math.max(0,change),
      paymentMode:  payMode,
      upiRef:       upiRef||undefined,
    }
    const r = await fetch('/api/bills',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    })
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) }
    catch { throw new Error('Server error: '+(text.slice(0,100)||'Empty response')) }
    if(!r.ok) throw new Error(data.error||`Save failed (${r.status})`)
    return data
  }

  const printWindow = (bill:any, cartSnap:CartItem[], custSnap:Customer|null)=>{
    const html = buildReceiptHTML(bill, cartSnap, custSnap, settings)
    const w = window.open('','_blank','width=420,height=700')!
    w.document.write(html); w.document.close()
  }

  const handlePrintOnly = ()=>{
    if(cart.length===0){flash('❌ Cart is empty — add items first','err');return}
    const draft={billNumber:'DRAFT-'+Date.now().toString().slice(-6),paymentMode:payMode,amountPaid:paid||total,changeAmount:Math.max(0,change),discountAmt:discAmt,totalAmount:total}
    printWindow(draft,cart,customer)
  }

  const handleSave = async()=>{
    if(cart.length===0){flash('❌ Cart is empty — scan or add items first','err');return}
    setSaving(true)
    try{
      const cartSnap=[...cart], custSnap=customer
      const bill=await saveBillAPI()
      setLastBill(bill); setLastCart(cartSnap); setLastCust(custSnap)
      flash(`✅ Bill ${bill.billNumber} saved!`)
      clearAll()
    }catch(e:any){flash('❌ '+e.message,'err')}
    setSaving(false)
  }

  const handleSaveAndPrint = async()=>{
    if(cart.length===0){flash('❌ Cart is empty — scan or add items first','err');return}
    setSaving(true)
    try{
      const cartSnap=[...cart], custSnap=customer
      const bill=await saveBillAPI()
      setLastBill(bill); setLastCart(cartSnap); setLastCust(custSnap)
      flash(`✅ Bill ${bill.billNumber} saved! Printing...`)
      printWindow(bill,cartSnap,custSnap)
      clearAll()
    }catch(e:any){flash('❌ '+e.message,'err')}
    setSaving(false)
  }

  const clearAll = ()=>{
    setCart([]); setCustomer(null); setBillDisc(0); setAmtPaid(''); setUpiRef('')
    setEntryName(''); setEntryProd(null); setEntryQty(1); setEntryDisc(0); setEntryRate('')
    setAcList([]); setShowEntry(true); setManualMode(false); setManualName(''); setManualRate(''); setScanVal('')
  }

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==='F7'){e.preventDefault();handlePrintOnly()}
      if(e.key==='F8'){e.preventDefault();handleSave()}
      if(e.key==='F9'){e.preventDefault();handleSaveAndPrint()}
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[cart,amtPaid,billDisc,payMode,customer])

  const entryRowTotal = entryProd?(parseFloat(entryRate)||entryProd.salePrice)*entryQty*(1-entryDisc/100):0

  return (
    <AppLayout>
      <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>

        {/* TOP BAR */}
        <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0 flex-wrap">
          <h1 className="font-bold text-gray-900 text-sm">POS Billing</h1>
          <button onClick={()=>setTimeout(()=>nameRef.current?.focus(),50)}
            className="px-3 py-1 rounded text-xs font-semibold border bg-blue-600 text-white border-blue-600 hover:bg-blue-700">
            + Add Item
          </button>
          <button onClick={()=>setManualMode(m=>!m)}
            className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${manualMode?'bg-orange-500 text-white border-orange-500':'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'}`}>
            ✏️ Manual Entry 1
          </button>
          <div className="relative ml-auto">
            {customer?(
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                <span className="text-xs font-medium text-blue-800">👤 {customer.name} — {customer.phone}</span>
                <button onClick={()=>{setCustomer(null);setCustSearch('')}} className="text-blue-400 hover:text-red-500">✕</button>
              </div>
            ):(
              <div>
                <input type="text" value={custSearch} onChange={e=>searchCust(e.target.value)}
                  placeholder="🔍 Customer name / phone" className="input w-48 py-1 text-xs"/>
                {custResults.length>0&&(
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-56">
                    {custResults.map(c=>(
                      <button key={c.id} onClick={()=>{setCustomer(c);setCustSearch('');setCustResults([])}}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0 text-xs">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-gray-400">{c.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SCAN BAR */}
        <div className="bg-green-50 border-b border-green-200 px-3 py-1.5 flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"/>
          <span className="text-xs font-bold text-green-700 shrink-0">SCAN:</span>
          <input ref={scanRef} value={scanVal} onChange={e=>setScanVal(e.target.value)}
            onKeyDown={handleScanKey}
            className="flex-1 border border-green-300 rounded px-3 py-1 text-sm font-mono bg-white outline-none focus:border-green-600"
            placeholder="Scan barcode here and press Enter — item goes directly to cart"
            autoFocus/>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold shrink-0">🟢 Ready</span>
        </div>

        {/* MANUAL ENTRY PANEL */}
        {manualMode&&(
          <div className="bg-orange-50 border-b-2 border-orange-300 px-3 py-2 shrink-0">
            <div className="flex items-end gap-2 flex-wrap">
              <div className="text-xs font-bold text-orange-700 self-center">✏️ MANUAL:</div>
              <div style={{flex:'1 1 160px'}}>
                <label className="text-xs text-gray-500 block mb-0.5">Item Name *</label>
                <input value={manualName} onChange={e=>setManualName(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&commitManual()}
                  placeholder="Type item name..."
                  className="w-full border border-orange-300 rounded px-2 py-1 text-xs outline-none bg-white focus:border-orange-500"/>
              </div>
              <div style={{width:85}}>
                <label className="text-xs text-gray-500 block mb-0.5">Rate ₹ *</label>
                <input type="number" value={manualRate} onChange={e=>setManualRate(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&commitManual()} placeholder="0.00"
                  className="w-full border border-orange-300 rounded px-2 py-1 text-xs outline-none bg-white text-right"/>
              </div>
              <div style={{width:58}}>
                <label className="text-xs text-gray-500 block mb-0.5">Qty</label>
                <input type="number" min={1} value={manualQty} onChange={e=>setManualQty(parseInt(e.target.value)||1)}
                  className="w-full border border-orange-300 rounded px-2 py-1 text-xs outline-none bg-white text-center"/>
              </div>
              <div style={{width:58}}>
                <label className="text-xs text-gray-500 block mb-0.5">Disc%</label>
                <input type="number" min={0} max={100} value={manualDisc} onChange={e=>setManualDisc(parseFloat(e.target.value)||0)}
                  className="w-full border border-orange-300 rounded px-2 py-1 text-xs outline-none bg-white text-center"/>
              </div>
              <div style={{width:62}}>
                <label className="text-xs text-gray-500 block mb-0.5">GST%</label>
                <select value={manualGst} onChange={e=>setManualGst(parseFloat(e.target.value))}
                  className="w-full border border-orange-300 rounded px-1 py-1 text-xs outline-none bg-white">
                  {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div className="self-end text-xs font-bold text-green-700 pb-1">
                ₹{manualRate?(parseFloat(manualRate)*manualQty*(1-manualDisc/100)).toFixed(2):'0.00'}
              </div>
              <button onClick={commitManual}
                className="self-end bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded text-xs font-bold h-7">
                + Add
              </button>
              <button onClick={()=>setManualMode(false)} className="self-end text-gray-400 px-2 py-1 text-xs hover:text-gray-600">✕</button>
            </div>
          </div>
        )}

        {/* MAIN */}
        <div className="flex flex-1 overflow-hidden">

          {/* CART */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-100">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs" style={{tableLayout:'fixed'}}>
                <colgroup>
                  <col style={{width:24}}/><col style={{width:'28%'}}/><col style={{width:82}}/><col style={{width:76}}/><col style={{width:52}}/><col style={{width:66}}/><col style={{width:46}}/><col style={{width:66}}/><col style={{width:80}}/><col style={{width:26}}/>
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr style={{background:'linear-gradient(180deg,#1e40af,#1d4ed8)',color:'#fff'}}>
                    <th className="px-1 py-2 text-center">#</th>
                    <th className="px-2 py-2 text-left">Item Name</th>
                    <th className="px-1 py-2 text-center">Qty</th>
                    <th className="px-2 py-2 text-right">Rate ₹</th>
                    <th className="px-1 py-2 text-right">Disc%</th>
                    <th className="px-2 py-2 text-right">Disc ₹</th>
                    <th className="px-1 py-2 text-right">Tax%</th>
                    <th className="px-2 py-2 text-right">Tax ₹</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                    <th className="px-1 py-2"/>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item,i)=>{
                    const dAmt=item.salePrice*item.qty*(item.disc/100)
                    const rowTotal=item.salePrice*item.qty*(1-item.disc/100)
                    return (
                      <tr key={item.uid} className={`border-b border-gray-100 ${i%2===0?'bg-white':'bg-blue-50/20'} hover:bg-yellow-50/40`}>
                        <td className="px-1 py-1.5 text-center text-gray-400">{i+1}</td>
                        <td className="px-2 py-1.5">
                          <div className="font-semibold text-blue-900 truncate">{item.name}</div>
                          <div className="text-gray-400 font-mono truncate">{item.barcode==='MANUAL'?'✏️ Manual':item.barcode}</div>
                        </td>
                        <td className="px-1 py-1.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={()=>updateQty(item.uid,item.qty-1)} className="w-5 h-5 rounded border border-gray-200 bg-gray-50 hover:bg-red-50 font-bold flex items-center justify-center">−</button>
                            <input type="number" min={1} value={item.qty} onChange={e=>updateQty(item.uid,parseInt(e.target.value)||1)}
                              className="w-8 text-center border border-gray-200 rounded py-0.5 font-bold text-xs"/>
                            <button onClick={()=>updateQty(item.uid,item.qty+1)} className="w-5 h-5 rounded border border-gray-200 bg-gray-50 hover:bg-green-50 font-bold flex items-center justify-center">+</button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right">₹{item.salePrice.toFixed(2)}</td>
                        <td className="px-1 py-1.5 text-right">
                          <input type="number" min={0} max={100} value={item.disc}
                            onChange={e=>updateDisc(item.uid,parseFloat(e.target.value)||0)}
                            className="w-10 text-right border border-gray-200 rounded py-0.5 px-1 text-xs"/>
                        </td>
                        <td className="px-2 py-1.5 text-right text-orange-600">₹{dAmt.toFixed(2)}</td>
                        <td className="px-1 py-1.5 text-right text-gray-500">{item.gstRate}%</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">₹{item.gstAmount.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-blue-900">₹{rowTotal.toFixed(2)}</td>
                        <td className="px-1 py-1.5 text-center text-red-400 hover:text-red-600 cursor-pointer text-sm"
                          onClick={()=>setCart(p=>p.filter(x=>x.uid!==item.uid))}>✕</td>
                      </tr>
                    )
                  })}

                  {/* ENTRY ROW — only shown when user clicks "+ Add Item" */}
                  {showEntry&&(
                    <tr className="border-b-2 border-blue-400 bg-blue-50">
                      <td className="px-1 py-1.5 text-center font-bold text-blue-500">{cart.length+1}</td>
                      <td className="px-2 py-1.5 relative">
                        <input ref={nameRef} value={entryName}
                          onChange={e=>onNameType(e.target.value)}
                          onKeyDown={onNameKey}
                          onFocus={()=>{if(entryName)onNameType(entryName)}}
                          placeholder="🔍 Type item name or barcode..."
                          className={`w-full border rounded px-2 py-1 text-xs outline-none ${entryProd?'border-green-500 bg-green-50 font-semibold text-green-900':'border-blue-400 bg-white focus:border-blue-600'}`}/>
                        {acList.length>0&&(
                          <div className="absolute top-full left-0 right-0 bg-white border-2 border-blue-500 rounded-b-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                            {acList.map((p,idx)=>(
                              <div key={p.id} onMouseDown={e=>{e.preventDefault();pickProduct(p)}}
                                className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 ${idx===acIdx?'bg-blue-100':'hover:bg-blue-50'}`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-semibold text-blue-900 text-xs">{p.name}</div>
                                    <div className="text-gray-400 font-mono text-xs">{p.barcode} · {p.category}{p.size?` · ${p.size}`:''}</div>
                                  </div>
                                  <span className="font-bold text-red-600 ml-2 text-xs">₹{p.salePrice}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {entryProd&&<div className="text-xs text-green-600 mt-0.5">✅ Selected — set qty and press ✓</div>}
                      </td>
                      <td className="px-1 py-1.5">
                        <input ref={qtyRef} type="number" min={1} value={entryQty}
                          onChange={e=>setEntryQty(parseInt(e.target.value)||1)}
                          onKeyDown={e=>{if(e.key==='Enter')commitEntry()}}
                          className="w-12 text-center border border-blue-300 rounded py-1 bg-white font-bold text-xs"/>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={entryRate} onChange={e=>setEntryRate(e.target.value)}
                          placeholder={entryProd?String(entryProd.salePrice):'₹'}
                          className="w-full text-right border border-blue-300 rounded px-1 py-1 bg-white text-xs"/>
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" min={0} max={100} value={entryDisc} onChange={e=>setEntryDisc(parseFloat(e.target.value)||0)}
                          className="w-10 text-right border border-blue-300 rounded py-1 px-1 bg-white text-xs"/>
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-400 text-xs">—</td>
                      <td className="px-1 py-1.5 text-right text-gray-400 text-xs">{entryProd?`${entryProd.gstRate}%`:'—'}</td>
                      <td className="px-2 py-1.5 text-right text-gray-400 text-xs">
                        {entryRowTotal>0?`₹${calcGst(entryRowTotal,entryProd?.gstRate||5).toFixed(2)}`:'—'}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold text-green-700 text-xs">
                        {entryRowTotal>0?`₹${entryRowTotal.toFixed(2)}`:'—'}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <div className="flex gap-0.5 justify-center">
                          <button onClick={commitEntry} title="Add to bill"
                            className={`w-6 h-6 rounded font-bold text-white text-xs flex items-center justify-center ${entryProd?'bg-green-600 hover:bg-green-700':'bg-gray-300'}`}>✓</button>
                          <button onClick={()=>{setShowEntry(false);setEntryName('');setEntryProd(null);setEntryQty(1);setEntryDisc(0);setEntryRate('');setAcList([])}}
                            title="Cancel" className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs flex items-center justify-center">✕</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {cart.length===0&&(
                    <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-3">🛍️</div>
                      <div className="font-medium text-sm">Cart is empty</div>
                      <div className="text-xs mt-1 space-y-1">
                        <div>📷 Scan barcode in the green bar above → item goes directly to cart</div>
                        <div>🔍 Click <strong>+ Add Item</strong> to search & add from inventory</div>
                        <div>✏️ Click <strong>Manual Entry</strong> for items not in system</div>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer totals */}
            <div className="bg-blue-50 border-t-2 border-blue-200 px-4 py-2 flex items-center justify-between shrink-0 text-xs font-bold text-blue-900">
              <span>Items: <span className="text-orange-600">{cart.length}</span></span>
              <span>Qty: <span className="text-orange-600">{cart.reduce((s,i)=>s+i.qty,0)}</span></span>
              <span className="text-sm">Subtotal: <span className="text-blue-900">{fmt(itemSub)}</span></span>
            </div>

            {/* Message */}
            {msg&&(
              <div className={`px-4 py-1.5 text-xs font-medium shrink-0 ${msgType==='ok'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>
                {msg}
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex gap-1.5 px-3 py-2 bg-gray-100 border-t border-gray-200 shrink-0">
              <button onClick={()=>setCart(p=>{const n=[...p];n.pop();return n})}
                style={{background:'linear-gradient(180deg,#d9534f,#b52b27)'}}
                className="flex-1 h-10 rounded font-bold text-xs text-white flex items-center justify-center gap-1">
                🗑 Remove Last
              </button>
              <button onClick={clearAll}
                style={{background:'linear-gradient(180deg,#888,#555)'}}
                className="flex-1 h-10 rounded font-bold text-xs text-white flex items-center justify-center">
                ✕ Clear All
              </button>
              <button onClick={handlePrintOnly}
                style={{background:'linear-gradient(180deg,#0891b2,#0e7490)'}}
                className="flex-1 h-10 rounded font-bold text-xs text-white flex items-center justify-center gap-1">
                🖨 Print (F7)
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{background:'linear-gradient(180deg,#3db35a,#27963e)'}}
                className="flex-1 h-10 rounded font-bold text-xs text-white flex items-center justify-center gap-1 disabled:opacity-60">
                {saving?'⏳ Saving...':'💾 Save (F8)'}
              </button>
              <button onClick={handleSaveAndPrint} disabled={saving}
                style={{background:'linear-gradient(180deg,#7c3aed,#6d28d9)'}}
                className="flex-1 h-10 rounded font-bold text-xs text-white flex items-center justify-center gap-1 disabled:opacity-60">
                {saving?'⏳...':'🖨💾 Save+Print (F9)'}
              </button>
            </div>
            {lastBill&&(
              <div className="px-3 pb-2 bg-gray-100">
                <button onClick={()=>printWindow(lastBill,lastCart,lastCust)}
                  className="w-full h-7 rounded text-xs font-semibold text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-1">
                  🔁 Reprint Last — {lastBill.billNumber}
                </button>
              </div>
            )}
          </div>

          {/* PAYMENT PANEL */}
          <div className="w-60 bg-white flex flex-col shrink-0 overflow-y-auto">
            <div className="p-3 border-b">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Mode</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['CASH','UPI','CARD','SPLIT'] as const).map(m=>(
                  <button key={m} onClick={()=>setPayMode(m)}
                    className={`h-9 rounded text-xs font-bold border transition-all ${payMode===m?'bg-green-600 text-white border-green-600':'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                    {m==='CASH'?'💵 Cash':m==='UPI'?'📱 UPI':m==='CARD'?'💳 Card':'🔀 Split'}
                  </button>
                ))}
              </div>
              {payMode==='UPI'&&(
                <input type="text" value={upiRef} onChange={e=>setUpiRef(e.target.value)}
                  placeholder="UPI Ref / Transaction ID" className="input mt-2 text-xs py-1.5"/>
              )}
            </div>

            <div className="p-3 border-b">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Summary</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.reduce((s,i)=>s+i.qty,0)} items)</span>
                  <span className="font-semibold">{fmt(itemSub)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-gray-600">Bill Disc %</span>
                  <input type="number" min={0} max={100} value={billDisc}
                    onChange={e=>setBillDisc(parseFloat(e.target.value)||0)}
                    className="w-16 text-right border border-gray-200 rounded text-xs py-0.5 px-1"/>
                </div>
                {discAmt>0&&<div className="flex justify-between text-orange-600"><span>Discount</span><span>−{fmt(discAmt)}</span></div>}
                {gstTotal > 0 && <div className="flex justify-between text-gray-400"><span>GST (incl.)</span><span>{fmt(gstTotal)}</span></div>}
                <div className="border-t pt-2 flex justify-between font-bold text-sm">
                  <span className="text-gray-900">TOTAL</span>
                  <span className="text-red-600 text-base">{fmt(total)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 border-b">
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Amount Received</label>
              <input type="number" value={amtPaid} onChange={e=>setAmtPaid(e.target.value)}
                placeholder={total>0?total.toFixed(2):'0.00'}
                className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-right text-lg font-bold font-mono text-blue-900 outline-none focus:border-blue-500"/>
              {paid>0&&(
                <div className={`flex justify-between text-xs font-bold mt-1.5 px-1 ${change>=0?'text-green-600':'text-red-600'}`}>
                  <span>{change>=0?'💚 Change:':'❌ Short by:'}</span>
                  <span>{fmt(Math.abs(change))}</span>
                </div>
              )}
            </div>

            <div className="p-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">GST Breakup</p>
              {cart.length===0?<div className="text-xs text-gray-300">No items</div>:
                (()=>{
                  const map:Record<number,{taxable:number,cgst:number,sgst:number}>={}
                  cart.forEach(item=>{
                    if(!item.gstRate||item.gstRate<=0) return
                    const t=item.salePrice*item.qty*(1-item.disc/100),g=calcGst(t,item.gstRate)
                    if(!map[item.gstRate])map[item.gstRate]={taxable:0,cgst:0,sgst:0}
                    map[item.gstRate].taxable+=t-g;map[item.gstRate].cgst+=g/2;map[item.gstRate].sgst+=g/2
                  })
                  const entries = Object.entries(map)
                  if(entries.length===0) return <div className="text-xs text-gray-300">No GST applicable</div>
                  return entries.map(([rate,v])=>(
                    <div key={rate} className="text-xs text-gray-600 mb-1 bg-gray-50 rounded px-2 py-1">
                      <div className="flex justify-between font-semibold"><span>GST {rate}%</span><span>{fmt(v.cgst+v.sgst)}</span></div>
                      <div className="text-gray-400">CGST {fmt(v.cgst)} + SGST {fmt(v.sgst)}</div>
                    </div>
                  ))
                })()
              }
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-700 flex gap-1 px-2 py-1 shrink-0">
          {['📋 Items (F1)','👥 Customers (F2)','🔍 Stock (F3)','💰 Payments (F4)','📅 Day End (F5)','🖨 Print (F7)','💾 Save (F8)','🖨💾 Save+Print (F9)'].map(label=>(
            <button key={label} className="flex-1 h-7 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded border border-blue-500">
              {label}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
