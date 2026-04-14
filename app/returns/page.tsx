'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../AppLayout'

interface BillItem {
  id: string; name: string; barcode: string; qty: number
  salePrice: number; gstRate: number; gstAmount: number; total: number
  productId?: string; size?: string
}
interface Bill {
  id: string; billNumber: string; totalAmount: number; createdAt: string
  items: BillItem[]
  customer?: { name: string; phone: string }
}
interface ReturnRecord {
  id: string; returnNumber: string; refundAmount: number; refundMode: string
  reason?: string; status: string; createdAt: string
  bill?: { billNumber: string }
  items: { name: string; qty: number; total: number }[]
}

const REASONS = ['Defective/Damaged','Wrong Size','Wrong Color','Customer Changed Mind','Wrong Item Delivered','Other']

export default function ReturnsPage() {
  const [tab, setTab]               = useState<'new'|'history'>('new')
  const [billNo, setBillNo]         = useState('')
  const [bill, setBill]             = useState<Bill|null>(null)
  const [billErr, setBillErr]       = useState('')
  const [billLoading, setBillLoading] = useState(false)
  const [returnItems, setReturnItems] = useState<(BillItem & {returnQty:number;selected:boolean})[]>([])
  const [reason, setReason]         = useState('')
  const [customReason, setCustomReason] = useState('')
  const [refundMode, setRefundMode] = useState<'CASH'|'UPI'|'CARD'>('CASH')
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')
  const [msgType, setMsgType]       = useState<'ok'|'err'>('ok')
  const [lastReturn, setLastReturn] = useState<any>(null)
  // Manual return (no bill)
  const [manualMode, setManualMode] = useState(false)
  const [manualItems, setManualItems] = useState<{name:string;qty:number;rate:number;selected:boolean}[]>([
    { name:'', qty:1, rate:0, selected:true }
  ])
  // History
  const [history, setHistory]       = useState<ReturnRecord[]>([])
  const [hFrom, setHFrom]           = useState(new Date().toISOString().slice(0,10))
  const [hTo, setHTo]               = useState(new Date().toISOString().slice(0,10))

  const flash = (m:string, t:'ok'|'err'='ok') => { setMsg(m); setMsgType(t); setTimeout(()=>setMsg(''),4000) }

  // Search bill by number
  const searchBill = async () => {
    if (!billNo.trim()) { setBillErr('Enter bill number'); return }
    setBillLoading(true); setBillErr(''); setBill(null); setReturnItems([])
    try {
      const r = await fetch(`/api/bills?search=${encodeURIComponent(billNo.trim())}`)
      const bills = await r.json()
      const found = Array.isArray(bills) ? bills.find((b:any) => b.billNumber.toLowerCase()===billNo.trim().toLowerCase()) : null
      if (!found) { setBillErr(`Bill "${billNo}" not found`); setBillLoading(false); return }
      setBill(found)
      setReturnItems(found.items.map((i:BillItem) => ({...i, returnQty:1, selected:false})))
    } catch { setBillErr('Error searching bill') }
    setBillLoading(false)
  }

  // Calculated refund
  const selectedItems = returnItems.filter(i=>i.selected)
  const refundTotal = selectedItems.reduce((s,i) => s + (i.salePrice * i.returnQty * (1 - 0/100)), 0)
  const manualRefund = manualItems.reduce((s,i) => s + (i.rate * i.qty), 0)

  // Submit return
  const submitReturn = async () => {
    const isManual = manualMode
    if (!isManual && selectedItems.length===0) { flash('⚠️ Select at least one item to return','err'); return }
    if (!reason && !customReason) { flash('⚠️ Select a reason for return','err'); return }

    setSaving(true)
    try {
      const items = isManual
        ? manualItems.filter(i=>i.name.trim()).map(i=>({
            name: i.name, barcode:'MANUAL', qty:i.qty,
            salePrice:i.rate, gstRate:0, gstAmount:0, total:i.rate*i.qty
          }))
        : selectedItems.map(i=>({
            productId: i.productId, name:i.name, barcode:i.barcode,
            qty:i.returnQty, salePrice:i.salePrice,
            gstRate:i.gstRate, gstAmount:(i.salePrice*i.returnQty*i.gstRate)/(100+i.gstRate),
            total:i.salePrice*i.returnQty
          }))

      const payload = {
        billId:       bill?.id,
        items,
        reason:       reason === 'Other' ? customReason : reason,
        notes,
        refundAmount: isManual ? manualRefund : refundTotal,
        refundMode,
      }

      const r = await fetch('/api/returns', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      })
      const data = await r.json()
      if (!r.ok) { flash('❌ '+(data.error||'Return failed'),'err'); setSaving(false); return }

      setLastReturn(data)
      flash(`✅ Return ${data.returnNumber} processed! Refund: ₹${(isManual?manualRefund:refundTotal).toFixed(2)}`)
      // Reset
      setBill(null); setBillNo(''); setReturnItems([]); setReason(''); setNotes(''); setCustomReason('')
      setManualItems([{name:'',qty:1,rate:0,selected:true}]); setManualMode(false)
    } catch (e:any) { flash('❌ '+e.message,'err') }
    setSaving(false)
  }

  const loadHistory = async () => {
    const r = await fetch(`/api/returns?from=${hFrom}T00:00:00&to=${hTo}T23:59:59`)
    if (r.ok) setHistory(await r.json())
  }

  useEffect(() => { if(tab==='history') loadHistory() },[tab])

  const printReturn = (ret: any) => {
    const w = window.open('','_blank','width=420,height=500')!
    w.document.write(`<!DOCTYPE html><html><head><title>Return ${ret.returnNumber}</title>
    <style>*{margin:0;padding:0}body{font-family:'Courier New',monospace;width:80mm;padding:8px;font-size:12px}.c{text-align:center}.b{font-weight:bold}.l{border-top:1px dashed #000;margin:5px 0}table{width:100%;border-collapse:collapse}@media print{body{margin:0}}</style>
    </head><body>
    <div class="c b" style="font-size:16px">AFY Fashion</div>
    <div class="c" style="font-size:11px">RETURN RECEIPT</div>
    <div class="l"></div>
    <div style="display:flex;justify-content:space-between;font-size:10px">
      <span>Return: <b>${ret.returnNumber}</b></span>
      <span>${new Date().toLocaleDateString('en-IN')}</span>
    </div>
    ${ret.bill?`<div style="font-size:10px">Ref Bill: ${ret.bill.billNumber}</div>`:''}
    ${ret.reason?`<div style="font-size:10px">Reason: ${ret.reason}</div>`:''}
    <div class="l"></div>
    <table><thead><tr>
      <th style="text-align:left;font-size:10px">Item</th>
      <th style="text-align:center;font-size:10px">Qty</th>
      <th style="text-align:right;font-size:10px">Amt</th>
    </tr></thead><tbody>
    ${(ret.items||[]).map((i:any)=>`<tr>
      <td style="font-size:11px;padding:2px 0">${i.name}</td>
      <td style="text-align:center;font-size:11px">${i.qty}</td>
      <td style="text-align:right;font-size:11px">${i.total?.toFixed(2)}</td>
    </tr>`).join('')}
    </tbody></table>
    <div class="l"></div>
    <div class="b" style="font-size:14px;display:flex;justify-content:space-between">
      <span>REFUND</span><span>Rs.${ret.refundAmount?.toFixed(2)}</span>
    </div>
    <div style="font-size:10px">Mode: ${ret.refundMode}</div>
    <div class="l"></div>
    <div class="c" style="font-size:10px">Stock updated automatically</div>
    <div class="c" style="font-size:9px">www.strydoz.in</div>
    <script>window.onload=function(){window.print();setTimeout(()=>window.close(),1200)}<\/script>
    </body></html>`)
    w.document.close()
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Returns</h1>
            <p className="text-sm text-gray-500">Process returns — stock updates automatically</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setTab('new')} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${tab==='new'?'bg-brand-600 text-white border-brand-600':'bg-white border-gray-200 text-gray-600'}`}>
              🔄 New Return
            </button>
            <button onClick={()=>setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${tab==='history'?'bg-brand-600 text-white border-brand-600':'bg-white border-gray-200 text-gray-600'}`}>
              📋 Return History
            </button>
          </div>
        </div>

        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium border ${msgType==='ok'?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-800'}`}>{msg}</div>}

        {/* ── NEW RETURN TAB ── */}
        {tab==='new' && (
          <div className="grid grid-cols-3 gap-5">
            {/* LEFT: Search + Items */}
            <div className="col-span-2 space-y-4">

              {/* Mode toggle */}
              <div className="flex gap-2">
                <button onClick={()=>setManualMode(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-all ${!manualMode?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  🧾 Return with Bill Number
                </button>
                <button onClick={()=>{setManualMode(true);setBill(null);setReturnItems([])}}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-all ${manualMode?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                  ✏️ Manual Return (No Bill)
                </button>
              </div>

              {/* BILL SEARCH */}
              {!manualMode && (
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-800 mb-3">Search Original Bill</h2>
                  <div className="flex gap-2">
                    <input type="text" value={billNo} onChange={e=>setBillNo(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&searchBill()}
                      placeholder="Enter bill number e.g. AFY202404140001"
                      className="input flex-1 font-mono"/>
                    <button onClick={searchBill} disabled={billLoading}
                      className="btn-primary px-5 disabled:opacity-60">
                      {billLoading?'⏳ Searching...':'🔍 Search'}
                    </button>
                  </div>
                  {billErr && <div className="mt-2 text-sm text-red-600 font-medium">❌ {billErr}</div>}

                  {/* Bill found */}
                  {bill && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="text-green-600 text-xl">✅</div>
                        <div>
                          <div className="font-bold text-green-800">{bill.billNumber}</div>
                          <div className="text-xs text-green-600">
                            {new Date(bill.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                            {bill.customer && ` · ${bill.customer.name}`}
                            {` · ₹${bill.totalAmount.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BILL ITEMS TO RETURN */}
              {!manualMode && bill && returnItems.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Select Items to Return</span>
                    <button onClick={()=>setReturnItems(p=>p.map(i=>({...i,selected:!p.every(x=>x.selected)})))}
                      className="text-xs text-blue-600 hover:underline">
                      {returnItems.every(i=>i.selected)?'Deselect All':'Select All'}
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                        <th className="px-4 py-2 w-8"></th>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-center">Purchased Qty</th>
                        <th className="px-4 py-2 text-center">Return Qty</th>
                        <th className="px-4 py-2 text-right">Rate</th>
                        <th className="px-4 py-2 text-right">Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {returnItems.map((item,i)=>(
                        <tr key={item.id} className={`transition-colors ${item.selected?'bg-green-50':''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={item.selected}
                              onChange={e=>setReturnItems(p=>p.map((x,j)=>j===i?{...x,selected:e.target.checked}:x))}
                              className="w-4 h-4"/>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.size && <div className="text-xs text-gray-400">Size: {item.size}</div>}
                            <div className="text-xs text-gray-400 font-mono">{item.barcode}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="badge badge-blue">{item.qty}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={()=>setReturnItems(p=>p.map((x,j)=>j===i?{...x,returnQty:Math.max(1,x.returnQty-1)}:x))}
                                className="w-6 h-6 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-xs flex items-center justify-center">−</button>
                              <input type="number" min={1} max={item.qty} value={item.returnQty}
                                onChange={e=>setReturnItems(p=>p.map((x,j)=>j===i?{...x,returnQty:Math.min(item.qty,parseInt(e.target.value)||1)}:x))}
                                className="w-10 text-center border border-gray-200 rounded text-xs py-0.5 font-bold"/>
                              <button onClick={()=>setReturnItems(p=>p.map((x,j)=>j===i?{...x,returnQty:Math.min(item.qty,x.returnQty+1)}:x))}
                                className="w-6 h-6 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-xs flex items-center justify-center">+</button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">₹{item.salePrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-700">
                            {item.selected ? `₹${(item.salePrice*item.returnQty).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MANUAL RETURN ITEMS */}
              {manualMode && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-orange-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">✏️ Manual Return Items</span>
                    <button onClick={()=>setManualItems(p=>[...p,{name:'',qty:1,rate:0,selected:true}])}
                      className="text-xs text-orange-600 font-semibold hover:underline">+ Add Row</button>
                  </div>
                  <div className="p-4 space-y-2">
                    {manualItems.map((item,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={item.name} onChange={e=>setManualItems(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
                          placeholder="Item name" className="input flex-1 text-sm"/>
                        <input type="number" min={1} value={item.qty} onChange={e=>setManualItems(p=>p.map((x,j)=>j===i?{...x,qty:parseInt(e.target.value)||1}:x))}
                          className="input w-16 text-center text-sm" placeholder="Qty"/>
                        <input type="number" min={0} step="0.01" value={item.rate} onChange={e=>setManualItems(p=>p.map((x,j)=>j===i?{...x,rate:parseFloat(e.target.value)||0}:x))}
                          className="input w-24 text-right text-sm" placeholder="₹ Rate"/>
                        <span className="text-sm font-bold text-green-700 w-20 text-right">₹{(item.rate*item.qty).toFixed(2)}</span>
                        <button onClick={()=>setManualItems(p=>p.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 text-lg">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* REASON */}
              {((!manualMode && selectedItems.length>0) || (manualMode && manualItems.some(i=>i.name))) && (
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Return Reason *</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {REASONS.map(r=>(
                      <button key={r} onClick={()=>{setReason(r);if(r!=='Other')setCustomReason('')}}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition-all ${reason===r?'bg-brand-600 text-white border-brand-600':'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  {reason==='Other' && (
                    <input type="text" value={customReason} onChange={e=>setCustomReason(e.target.value)}
                      placeholder="Describe the reason..." className="input mb-3"/>
                  )}
                  <div>
                    <label className="label">Additional Notes (optional)</label>
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                      placeholder="Any extra notes..." className="input" rows={2}/>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Summary + Action */}
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Return Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Items returning</span>
                    <span className="font-medium">{manualMode ? manualItems.filter(i=>i.name).length : selectedItems.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Total qty</span>
                    <span className="font-medium">{manualMode ? manualItems.reduce((s,i)=>s+i.qty,0) : selectedItems.reduce((s,i)=>s+i.returnQty,0)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-base">
                    <span>Refund Amount</span>
                    <span className="text-green-700">₹{(manualMode?manualRefund:refundTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Refund Mode</p>
                <div className="space-y-2">
                  {(['CASH','UPI','CARD'] as const).map(m=>(
                    <button key={m} onClick={()=>setRefundMode(m)}
                      className={`w-full py-2.5 rounded-lg text-sm font-bold border transition-all ${refundMode===m?'bg-green-600 text-white border-green-600':'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                      {m==='CASH'?'💵 Cash Refund':m==='UPI'?'📱 UPI Refund':'💳 Card Refund'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
                <div className="font-bold mb-1">ℹ️ What happens:</div>
                <div>✅ Return record created</div>
                <div>✅ Stock increased automatically</div>
                <div>✅ Original bill marked as returned</div>
                <div>✅ Return receipt printed</div>
              </div>

              <button onClick={submitReturn} disabled={saving ||
                (!manualMode && selectedItems.length===0) ||
                (manualMode && !manualItems.some(i=>i.name.trim())) ||
                (!reason && !customReason)}
                className="w-full btn-primary py-3 justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? '⏳ Processing...' : '🔄 Process Return'}
              </button>

              {lastReturn && (
                <button onClick={()=>printReturn(lastReturn)}
                  className="w-full btn-secondary py-2.5 justify-center">
                  🖨️ Print Return Receipt — {lastReturn.returnNumber}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab==='history' && (
          <div>
            <div className="flex gap-3 mb-4 items-center flex-wrap">
              <input type="date" value={hFrom} onChange={e=>setHFrom(e.target.value)} className="input text-sm"/>
              <span className="text-gray-400">to</span>
              <input type="date" value={hTo} onChange={e=>setHTo(e.target.value)} className="input text-sm"/>
              <button onClick={loadHistory} className="btn-primary text-sm">🔍 Load</button>
            </div>

            {/* Summary */}
            {history.length>0 && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="card p-4">
                  <div className="text-xs text-gray-500 uppercase font-medium">Total Returns</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{history.length}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500 uppercase font-medium">Total Refunded</div>
                  <div className="text-2xl font-bold text-red-600 mt-1">₹{history.reduce((s,r)=>s+r.refundAmount,0).toFixed(2)}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500 uppercase font-medium">Items Returned</div>
                  <div className="text-2xl font-bold text-orange-600 mt-1">{history.reduce((s,r)=>s+r.items.reduce((ss,i)=>ss+(i.qty||0),0),0)}</div>
                </div>
              </div>
            )}

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-4 py-3 text-left">Return No.</th>
                    <th className="px-4 py-3 text-left">Ref Bill</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-right">Refund</th>
                    <th className="px-4 py-3 text-center">Mode</th>
                    <th className="px-4 py-3 text-center">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(r=>(
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-brand-700 text-xs">{r.returnNumber}</td>
                      <td className="px-4 py-3 text-xs">{r.bill?.billNumber||<span className="text-gray-400">Manual</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.reason||'—'}</td>
                      <td className="px-4 py-3 text-center text-xs">{r.items?.length||0}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600 text-sm">₹{r.refundAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center"><span className="badge badge-blue text-xs">{r.refundMode}</span></td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={()=>printReturn(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">🖨️</button>
                      </td>
                    </tr>
                  ))}
                  {history.length===0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No returns found for selected date range</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
