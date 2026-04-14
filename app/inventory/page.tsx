'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import AppLayout from '../AppLayout'

interface Product {
  id:string; barcode:string; name:string; category:string
  size?:string; color?:string; costPrice:number; purchaseRate:number
  mrp:number; salePrice:number; gstRate:number; stock:number
}

const DEFAULT_CATS = ['Jeans','Shirt','T-Shirt','Kurti','Saree','Legging','Dress','Trouser','Frock','Shorts','Jacket','Other']
const EMPTY = { barcode:'', name:'', category:'T-Shirt', size:'', color:'', costPrice:'', purchaseRate:'', mrp:'', salePrice:'', gstRate:'5', stock:'' }

function BarcodeCanvas({ value, width=180, height=46 }: { value:string; width?:number; height?:number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current || !value) return
    const ctx = ref.current.getContext('2d')!
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,width,height)
    const bars=[3]
    for (let i=0;i<value.length;i++) { const c=value.charCodeAt(i); bars.push(1+(c%3),1+((c>>2)%3),1+((c>>4)%2),1+((c>>5)%3)) }
    bars.push(2,1,3)
    const total=bars.reduce((a,b)=>a+b,0), scale=(width-16)/total
    let x=8; ctx.fillStyle='#000'
    bars.forEach((w,i)=>{ if(i%2===0) ctx.fillRect(x,3,w*scale,height-16); x+=w*scale })
    ctx.font='9px monospace'; ctx.textAlign='center'; ctx.fillStyle='#000'
    ctx.fillText(value, width/2, height-2)
  },[value,width,height])
  return <canvas ref={ref} width={width} height={height}/>
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATS)
  const [search, setSearch]     = useState('')
  const [cat, setCat]           = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<any>({...EMPTY})
  const [editId, setEditId]     = useState<string|null>(null)
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok')
  const [loading, setLoading]   = useState(false)
  const [labelQty, setLabelQty] = useState<Record<string,number>>({})
  // Category management
  const [showCatMgr, setShowCatMgr] = useState(false)
  const [newCat, setNewCat]     = useState('')

  const load = useCallback(async () => {
    const [pr, cr] = await Promise.all([fetch('/api/products'), fetch('/api/categories')])
    if (pr.ok) setProducts(await pr.json())
    if (cr.ok) { const cats = await cr.json(); setCategories(['All',...cats.map((c:any)=>c.name)]) }
  },[])

  useEffect(()=>{ load() },[load])

  const flash = (m:string, t:'ok'|'err'='ok') => { setMsg(m); setMsgType(t); setTimeout(()=>setMsg(''),4000) }

  const filtered = products.filter(p => {
    const q=search.toLowerCase()
    return (!q||p.name.toLowerCase().includes(q)||p.barcode.includes(q)) && (cat==='All'||p.category===cat)
  })

  const openEdit = (p:Product) => {
    setForm({ barcode:p.barcode, name:p.name, category:p.category, size:p.size||'', color:p.color||'', costPrice:String(p.costPrice||0), purchaseRate:String(p.purchaseRate||0), mrp:String(p.mrp), salePrice:String(p.salePrice), gstRate:String(p.gstRate), stock:String(p.stock) })
    setEditId(p.id); setShowForm(true)
  }

  const save = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!form.barcode.trim()) { flash('❌ Barcode required','err'); return }
    if (!form.name.trim())    { flash('❌ Name required','err'); return }
    setLoading(true)
    const payload = { ...form, costPrice:parseFloat(form.costPrice)||0, purchaseRate:parseFloat(form.purchaseRate)||0, mrp:parseFloat(form.mrp), salePrice:parseFloat(form.salePrice), gstRate:parseFloat(form.gstRate??'0'), stock:parseInt(form.stock)||0 }
    const r = await fetch(editId?`/api/products/${editId}`:'/api/products', { method:editId?'PUT':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    const result = await r.json()
    setLoading(false)
    if (!r.ok) flash('❌ '+(result.error||'Failed'),'err')
    else { flash(editId?'✅ Updated!':'✅ Added!'); setShowForm(false); setForm({...EMPTY}); setEditId(null); load() }
  }

  const del = async (id:string,name:string) => {
    if (!confirm(`Delete "${name}"?`)) return
    const r = await fetch(`/api/products/${id}`,{method:'DELETE'})
    r.ok ? (flash('🗑️ Deleted'), load()) : flash('❌ Delete failed','err')
  }

  const printLabel = async (productId:string, qty:number) => {
    const r = await fetch('/api/print/label',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId,qty})})
    flash(r.ok?`🖨️ ${qty} label(s) sent!`:'❌ Print failed', r.ok?'ok':'err')
  }

  const addCategory = async () => {
    if (!newCat.trim()) return
    const r = await fetch('/api/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newCat.trim()})})
    if (r.ok) { flash('✅ Category added'); setNewCat(''); load() }
    else { const d=await r.json(); flash('❌ '+(d.error||'Failed'),'err') }
  }

  const delCategory = async (name:string) => {
    if (!confirm(`Delete category "${name}"?`)) return
    const r = await fetch('/api/categories',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})})
    r.ok ? (flash('🗑️ Category deleted'), load()) : flash('❌ Cannot delete (in use)','err')
  }

  const calcProfit = (p:Product) => {
    const profit=p.salePrice-p.purchaseRate
    const margin=p.purchaseRate>0?((profit/p.purchaseRate)*100).toFixed(1):'0'
    return { profit:profit.toFixed(2), margin }
  }

  const cats = categories.includes('All') ? categories : ['All',...categories]

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-sm text-gray-500">{products.length} products · {products.reduce((s,p)=>s+p.stock,0)} total stock</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setShowCatMgr(true)} className="btn-secondary text-sm">🏷️ Manage Categories</button>
            <button onClick={()=>{setShowForm(true);setEditId(null);setForm({...EMPTY})}} className="btn-primary">+ Add Product</button>
          </div>
        </div>

        {msg&&<div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium border ${msgType==='ok'?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-800'}`}>{msg}</div>}

        <div className="flex gap-3 mb-4 flex-wrap items-center">
          <input type="text" placeholder="🔍 Search name, barcode..." value={search} onChange={e=>setSearch(e.target.value)} className="input max-w-xs"/>
          <div className="flex gap-1 flex-wrap">
            {cats.map(c=>(
              <button key={c} onClick={()=>setCat(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${cat===c?'bg-brand-600 text-white border-brand-600':'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-3 py-3 text-left">Product</th>
                  <th className="px-3 py-3 text-left">Barcode</th>
                  <th className="px-3 py-3 text-right">Cost</th>
                  <th className="px-3 py-3 text-right">Purchase</th>
                  <th className="px-3 py-3 text-right">MRP</th>
                  <th className="px-3 py-3 text-right">Sale</th>
                  <th className="px-3 py-3 text-right">Profit</th>
                  <th className="px-3 py-3 text-right">GST</th>
                  <th className="px-3 py-3 text-right">Stock</th>
                  <th className="px-3 py-3 text-center">Labels</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p=>{
                  const {profit,margin}=calcProfit(p)
                  return (
                    <tr key={p.id} className="group hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.category}{p.size&&` · ${p.size}`}{p.color&&` · ${p.color}`}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-500">{p.barcode}</td>
                      <td className="px-3 py-3 text-right text-xs text-gray-400">₹{p.costPrice||0}</td>
                      <td className="px-3 py-3 text-right text-xs text-gray-500">₹{p.purchaseRate||0}</td>
                      <td className="px-3 py-3 text-right text-xs text-gray-400 line-through">₹{p.mrp}</td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900">₹{p.salePrice}</td>
                      <td className="px-3 py-3 text-right"><span className="text-xs font-semibold text-green-700">₹{profit}</span><span className="text-xs text-gray-400 ml-1">({margin}%)</span></td>
                      <td className="px-3 py-3 text-right text-xs text-gray-500">{p.gstRate}%</td>
                      <td className="px-3 py-3 text-right"><span className={`badge ${p.stock>10?'badge-green':p.stock>0?'badge-yellow':'badge-red'}`}>{p.stock}</span></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" min={1} max={200} value={labelQty[p.id]||1}
                            onChange={e=>setLabelQty(prev=>({...prev,[p.id]:parseInt(e.target.value)||1}))}
                            className="w-10 text-center border border-gray-200 rounded text-xs py-1"/>
                          <button onClick={()=>printLabel(p.id,labelQty[p.id]||1)} className="btn-secondary text-xs py-1 px-2">🖨️</button>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>openEdit(p)} className="btn-secondary text-xs py-1 px-2">✏️ Edit</button>
                          <button onClick={()=>del(p.id,p.name)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length===0&&<tr><td colSpan={11} className="px-4 py-14 text-center text-gray-400"><div className="text-3xl mb-2">📦</div>No products found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Manager Modal */}
      {showCatMgr&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">🏷️ Manage Categories</h2>
              <button onClick={()=>setShowCatMgr(false)} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <input type="text" value={newCat} onChange={e=>setNewCat(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addCategory()}
                  placeholder="New category name..." className="input flex-1"/>
                <button onClick={addCategory} className="btn-primary px-4">+ Add</button>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {categories.filter(c=>c!=='All').map(c=>(
                  <div key={c} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">{c}</span>
                    <button onClick={()=>delCategory(c)} className="text-xs text-red-400 hover:text-red-600 px-2">🗑</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showForm&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-bold text-lg">{editId?'✏️ Edit Product':'+ Add New Product'}</h2>
              <button onClick={()=>{setShowForm(false);setEditId(null);setForm({...EMPTY})}} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="label">Barcode *</label>
                <input required className="input font-mono" value={form.barcode} onChange={e=>setForm((f:any)=>({...f,barcode:e.target.value}))} placeholder="Scan or type barcode"/>
                {form.barcode&&<div className="mt-2 p-2 bg-gray-50 rounded-lg inline-block"><BarcodeCanvas value={form.barcode}/></div>}
              </div>
              <div>
                <label className="label">Product Name *</label>
                <input required className="input" value={form.name} onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))} placeholder="e.g. Men Slim Fit Jeans Blue 32"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e=>setForm((f:any)=>({...f,category:e.target.value}))}>
                    {categories.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">GST Rate %</label>
                  <select className="input" value={form.gstRate} onChange={e=>setForm((f:any)=>({...f,gstRate:e.target.value}))}>
                    {['0','5','12','18','28'].map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div><label className="label">Size</label><input className="input" value={form.size} onChange={e=>setForm((f:any)=>({...f,size:e.target.value}))} placeholder="S/M/L/32/Free"/></div>
                <div><label className="label">Color</label><input className="input" value={form.color} onChange={e=>setForm((f:any)=>({...f,color:e.target.value}))} placeholder="Red, Blue..."/></div>
              </div>
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase">💰 Price Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Actual Cost (₹)</label>
                    <input type="number" min={0} step="0.01" className="input bg-white" value={form.costPrice} onChange={e=>setForm((f:any)=>({...f,costPrice:e.target.value}))} placeholder="Your buying cost"/>
                  </div>
                  <div>
                    <label className="label">Purchase Rate (₹)</label>
                    <input type="number" min={0} step="0.01" className="input bg-white" value={form.purchaseRate} onChange={e=>setForm((f:any)=>({...f,purchaseRate:e.target.value}))} placeholder="Wholesale rate"/>
                  </div>
                  <div>
                    <label className="label">MRP (₹) *</label>
                    <input required type="number" min={0} step="0.01" className="input bg-white" value={form.mrp} onChange={e=>setForm((f:any)=>({...f,mrp:e.target.value}))} placeholder="Max Retail Price"/>
                  </div>
                  <div>
                    <label className="label">Sale Price (₹) *</label>
                    <input required type="number" min={0} step="0.01" className="input bg-white" value={form.salePrice} onChange={e=>setForm((f:any)=>({...f,salePrice:e.target.value}))} placeholder="Selling price"/>
                  </div>
                </div>
                {form.purchaseRate&&form.salePrice&&(
                  <div className="bg-white rounded-lg p-3 border border-blue-200 text-xs flex gap-4 flex-wrap">
                    <div><span className="text-gray-500">Profit:</span><span className="font-bold text-green-700 ml-1">₹{(parseFloat(form.salePrice||0)-parseFloat(form.purchaseRate||0)).toFixed(2)}</span></div>
                    <div><span className="text-gray-500">Margin:</span><span className="font-bold text-blue-700 ml-1">{parseFloat(form.purchaseRate||0)>0?(((parseFloat(form.salePrice||0)-parseFloat(form.purchaseRate||0))/parseFloat(form.purchaseRate||0))*100).toFixed(1):0}%</span></div>
                    <div><span className="text-gray-500">MRP Disc:</span><span className="font-bold text-orange-600 ml-1">{parseFloat(form.mrp||0)>0?(((parseFloat(form.mrp||0)-parseFloat(form.salePrice||0))/parseFloat(form.mrp||0))*100).toFixed(1):0}%</span></div>
                  </div>
                )}
              </div>
              <div><label className="label">Stock Qty *</label><input required type="number" min={0} className="input" value={form.stock} onChange={e=>setForm((f:any)=>({...f,stock:e.target.value}))} placeholder="0"/></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-60">{loading?'⏳ Saving...':editId?'💾 Update Product':'+ Add Product'}</button>
                <button type="button" onClick={()=>{setShowForm(false);setEditId(null);setForm({...EMPTY})}} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
