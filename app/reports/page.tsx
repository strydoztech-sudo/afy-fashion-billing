'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../AppLayout'

interface Bill {
  id:string; billNumber:string; totalAmount:number; gstAmount:number; discountAmt:number
  paymentMode:string; status:string; createdAt:string; showGst:boolean
  customer?:{name:string;phone:string}
  items:{name:string;qty:number;total:number}[]
}

export default function ReportsPage() {
  const [bills, setBills]     = useState<Bill[]>([])
  const [from, setFrom]       = useState(new Date().toISOString().slice(0,10))
  const [to, setTo]           = useState(new Date().toISOString().slice(0,10))
  const [loading, setLoading] = useState(false)
  const [editBill, setEditBill] = useState<Bill|null>(null)
  const [editStatus, setEditStatus] = useState('PAID')
  const [editNotes, setEditNotes]   = useState('')
  const [msg, setMsg]         = useState('')

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/bills?from=${from}T00:00:00&to=${to}T23:59:59`)
    if (r.ok) setBills(await r.json())
    setLoading(false)
  }

  useEffect(()=>{ load() },[])

  const flash = (m:string) => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const summary = bills.reduce((s,b)=>({
    total:    s.total    + b.totalAmount,
    gst:      s.gst      + b.gstAmount,
    count:    s.count    + 1,
    cash:     s.cash     + (b.paymentMode==='CASH'  ? b.totalAmount : 0),
    upi:      s.upi      + (b.paymentMode==='UPI'   ? b.totalAmount : 0),
    card:     s.card     + (b.paymentMode==='CARD'  ? b.totalAmount : 0),
    discount: s.discount + b.discountAmt,
  }),{total:0,gst:0,count:0,cash:0,upi:0,card:0,discount:0})

  const deleteBill = async (id:string, num:string) => {
    if (!confirm(`Delete bill ${num}? This cannot be undone.`)) return
    const r = await fetch(`/api/bills/${id}`,{method:'DELETE'})
    r.ok ? (flash(`🗑️ Bill ${num} deleted`), load()) : flash('❌ Delete failed')
  }

  const saveBillEdit = async () => {
    if (!editBill) return
    const r = await fetch(`/api/bills/${editBill.id}`,{
      method:'PUT', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ status:editStatus, notes:editNotes, paymentMode:editBill.paymentMode,
        amountPaid:editBill.totalAmount, changeAmount:0, discountAmt:editBill.discountAmt,
        discountPct:0, totalAmount:editBill.totalAmount, subtotal:editBill.totalAmount,
        gstAmount:editBill.gstAmount, showGst:editBill.showGst })
    })
    if (r.ok) { flash('✅ Bill updated'); setEditBill(null); load() }
    else flash('❌ Update failed')
  }

  const printBill = (bill: Bill) => {
    const w = window.open('','_blank','width=420,height=600')!
    const items = bill.items.map(i=>`<tr><td style="font-size:11px;padding:2px 0">${i.name}</td><td style="text-align:center;font-size:11px">${i.qty}</td><td style="text-align:right;font-size:11px;font-weight:bold">${i.total.toFixed(2)}</td></tr>`).join('')
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${bill.billNumber}</title>
    <style>*{margin:0;padding:0}body{font-family:'Courier New',monospace;width:80mm;padding:8px;font-size:12px}.c{text-align:center}.b{font-weight:bold}.l{border-top:1px dashed #000;margin:5px 0}table{width:100%;border-collapse:collapse}@media print{body{margin:0}}</style>
    </head><body>
    <div class="c b" style="font-size:16px">AFY Fashion</div>
    <div class="l"></div>
    <div style="display:flex;justify-content:space-between;font-size:10px"><span>Bill: <b>${bill.billNumber}</b></span><span>${new Date(bill.createdAt).toLocaleDateString('en-IN')}</span></div>
    ${bill.customer?`<div style="font-size:10px">Customer: ${bill.customer.name}</div>`:''}
    <div class="l"></div>
    <table><thead><tr><th style="text-align:left;font-size:10px">Item</th><th style="text-align:center;font-size:10px">Qty</th><th style="text-align:right;font-size:10px">Amt</th></tr></thead><tbody>${items}</tbody></table>
    <div class="l"></div>
    ${bill.showGst?`<div style="font-size:11px;display:flex;justify-content:space-between"><span>GST</span><span>${bill.gstAmount.toFixed(2)}</span></div>`:''}
    <div class="l"></div>
    <div class="b" style="font-size:15px;display:flex;justify-content:space-between"><span>TOTAL</span><span>Rs.${bill.totalAmount.toFixed(2)}</span></div>
    <div style="font-size:10px;display:flex;justify-content:space-between"><span>Mode</span><span>${bill.paymentMode}</span></div>
    <div class="l"></div>
    <div class="c" style="font-size:10px">Thank you! | www.strydoz.in</div>
    <script>window.onload=function(){window.print();setTimeout(()=>window.close(),1200)}<\/script>
    </body></html>`)
    w.document.close()
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Sales Reports</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="input text-sm"/>
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="input text-sm"/>
            <button onClick={load} className="btn-primary text-sm">{loading?'Loading...':'🔍 Load'}</button>
            <button onClick={()=>window.print()} className="btn-secondary text-sm no-print">🖨️ Print Report</button>
          </div>
        </div>

        {msg&&<div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">{msg}</div>}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {label:'Total Sales',   value:`₹${summary.total.toFixed(2)}`,    color:'text-brand-700'},
            {label:'Bills Count',   value:String(summary.count),              color:'text-blue-700'},
            {label:'GST Collected', value:`₹${summary.gst.toFixed(2)}`,      color:'text-green-700'},
            {label:'Cash Sales',    value:`₹${summary.cash.toFixed(2)}`,     color:'text-gray-700'},
            {label:'UPI Sales',     value:`₹${summary.upi.toFixed(2)}`,      color:'text-purple-700'},
            {label:'Discount Given',value:`₹${summary.discount.toFixed(2)}`, color:'text-orange-700'},
          ].map(c=>(
            <div key={c.label} className="card p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">{c.label}</div>
              <div className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-sm flex items-center justify-between">
            <span>Bills ({bills.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">Bill No.</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Mode</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bills.map(b=>(
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-brand-700 text-xs">{b.billNumber}</td>
                    <td className="px-4 py-3 text-xs">{b.customer?<div><div>{b.customer.name}</div><div className="text-gray-400">{b.customer.phone}</div></div>:<span className="text-gray-400">Walk-in</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(b.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
                    <td className="px-4 py-3 text-center text-xs">{b.items?.length||0}</td>
                    <td className="px-4 py-3 text-right font-semibold text-xs">₹{b.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center"><span className="badge badge-blue text-xs">{b.paymentMode}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`badge text-xs ${b.status==='PAID'?'badge-green':b.status==='CANCELLED'?'badge-red':'badge-yellow'}`}>{b.status}</span></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={()=>printBill(b)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Print">🖨️</button>
                        <button onClick={()=>{setEditBill(b);setEditStatus(b.status);setEditNotes('')}} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100" title="Edit">✏️</button>
                        <button onClick={()=>deleteBill(b.id,b.billNumber)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bills.length===0&&!loading&&<tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No bills found for selected date range</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Bill Modal */}
      {editBill&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">✏️ Edit Bill — {editBill.billNumber}</h2>
              <button onClick={()=>setEditBill(null)} className="text-gray-400 text-xl hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Status</label>
                <select className="input" value={editStatus} onChange={e=>setEditStatus(e.target.value)}>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Add note to this bill..."/>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Bill No:</span><span className="font-mono font-medium">{editBill.billNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total:</span><span className="font-bold">₹{editBill.totalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment:</span><span>{editBill.paymentMode}</span></div>
              </div>
              <div className="flex gap-3">
                <button onClick={saveBillEdit} className="btn-primary flex-1 justify-center">💾 Update Bill</button>
                <button onClick={()=>setEditBill(null)} className="btn-secondary px-6">Cancel</button>
              </div>
              <button onClick={()=>deleteBill(editBill.id,editBill.billNumber)} className="w-full btn-danger justify-center text-sm">🗑️ Delete This Bill</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
