'use client'
import { useState, useEffect } from 'react'
import AppLayout from '../AppLayout'

const SHOP_FIELDS = [
  { key:'shop_name',      label:'Shop Name',      placeholder:'AFY Fashion' },
  { key:'shop_address',   label:'Shop Address',   placeholder:'123, Main St, Chennai' },
  { key:'shop_phone',     label:'Phone',          placeholder:'9876543210' },
  { key:'shop_gst',       label:'GSTIN',          placeholder:'33ABCDE1234F1Z5' },
  { key:'receipt_footer', label:'Receipt Footer', placeholder:'Thank you for shopping!' },
  { key:'bill_prefix',    label:'Bill Prefix',    placeholder:'AFY' },
]
const PRINTER_FIELDS = [
  { key:'thermal_printer_type', label:'Thermal Printer Type', placeholder:'network | usb' },
  { key:'thermal_printer_ip',   label:'Thermal Printer IP',   placeholder:'192.168.1.100' },
  { key:'label_printer_type',   label:'Label Printer Type',   placeholder:'network | usb' },
  { key:'label_printer_ip',     label:'Label Printer IP',     placeholder:'192.168.1.101' },
]

interface User {
  id:string; username:string; name:string; role:string; active:boolean; createdAt:string
}

const EMPTY_USER = { username:'', password:'', name:'', role:'cashier' }

export default function SettingsPage() {
  const [values, setValues]   = useState<Record<string,string>>({})
  const [msg, setMsg]         = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')
  const [gstEnabled, setGstEnabled] = useState(true)
  const [tab, setTab]         = useState<'shop'|'printer'|'gst'|'users'>('shop')

  // Users state
  const [users, setUsers]         = useState<User[]>([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser]     = useState({...EMPTY_USER})
  const [editUser, setEditUser]   = useState<User|null>(null)
  const [editPass, setEditPass]   = useState('')
  const [userMsg, setUserMsg]     = useState('')
  const [userMsgType, setUserMsgType] = useState<'ok'|'err'>('ok')
  const [userLoading, setUserLoading] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r=>r.json()).then(d=>{
      setValues(d)
      setGstEnabled(d.gst_enabled !== 'false')
    }).catch(()=>{})
  },[])

  useEffect(() => {
    if (tab === 'users') loadUsers()
  },[tab])

  const loadUsers = async () => {
    try {
      const r = await fetch('/api/users')
      if (r.ok) setUsers(await r.json())
    } catch {}
  }

  const flash = (m:string, t:'ok'|'err'='ok') => { setMsg(m); setMsgType(t); setTimeout(()=>setMsg(''),3500) }
  const flashUser = (m:string, t:'ok'|'err'='ok') => { setUserMsg(m); setUserMsgType(t); setTimeout(()=>setUserMsg(''),3500) }

  const saveSettings = async (e:React.FormEvent) => {
    e.preventDefault()
    const r = await fetch('/api/settings',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...values, gst_enabled: gstEnabled?'true':'false'})
    })
    flash(r.ok?'✅ Settings saved!':'❌ Failed to save', r.ok?'ok':'err')
  }

  // Create user
  const createUser = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!newUser.username.trim()) { flashUser('❌ Username required','err'); return }
    if (!newUser.password || newUser.password.length < 4) { flashUser('❌ Password min 4 characters','err'); return }
    if (!newUser.name.trim()) { flashUser('❌ Name required','err'); return }
    setUserLoading(true)
    try {
      const r = await fetch('/api/users',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(newUser)
      })
      const data = await r.json()
      if (!r.ok) { flashUser('❌ '+(data.error||'Failed'),'err') }
      else {
        flashUser(`✅ User "${data.username}" created!`)
        setNewUser({...EMPTY_USER}); setShowAddUser(false); loadUsers()
      }
    } catch { flashUser('❌ Network error','err') }
    setUserLoading(false)
  }

  // Update user
  const updateUser = async () => {
    if (!editUser) return
    setUserLoading(true)
    try {
      const payload: any = { id:editUser.id, name:editUser.name, role:editUser.role, active:editUser.active }
      if (editPass && editPass.length >= 4) payload.newPassword = editPass
      else if (editPass && editPass.length > 0 && editPass.length < 4) {
        flashUser('❌ Password must be at least 4 characters','err'); setUserLoading(false); return
      }
      const r = await fetch('/api/users',{
        method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
      })
      if (r.ok) { flashUser('✅ User updated!'); setEditUser(null); setEditPass(''); loadUsers() }
      else { const d=await r.json(); flashUser('❌ '+(d.error||'Failed'),'err') }
    } catch { flashUser('❌ Network error','err') }
    setUserLoading(false)
  }

  // Delete user
  const deleteUser = async (u: User) => {
    const loggedIn = JSON.parse(localStorage.getItem('afy_user')||'{}')
    if (u.username === loggedIn.username) { flashUser('❌ Cannot delete your own account!','err'); return }
    if (!confirm(`Delete user "${u.name}" (${u.username})?`)) return
    setUserLoading(true)
    const r = await fetch('/api/users',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:u.id})})
    if (r.ok) { flashUser('🗑️ User deleted'); loadUsers() }
    else flashUser('❌ Delete failed','err')
    setUserLoading(false)
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {([['shop','🏪 Shop'],['printer','🖨️ Printers'],['gst','💰 GST'],['users','👤 Users']] as const).map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${tab===t?'bg-brand-600 text-white border-brand-600':'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {msg&&<div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium border ${msgType==='ok'?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-800'}`}>{msg}</div>}

        {/* SHOP TAB */}
        {tab==='shop'&&(
          <form onSubmit={saveSettings}>
            <div className="card p-6 space-y-4">
              {SHOP_FIELDS.map(f=>(
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input className="input" value={values[f.key]||''} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder}/>
                </div>
              ))}
            </div>
            <div className="mt-4"><button type="submit" className="btn-primary py-2.5 px-8">💾 Save Settings</button></div>
          </form>
        )}

        {/* PRINTER TAB */}
        {tab==='printer'&&(
          <form onSubmit={saveSettings}>
            <div className="card p-6 space-y-4">
              {PRINTER_FIELDS.map(f=>(
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input className="input" value={values[f.key]||''} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder}/>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 space-y-1">
                <div className="font-bold mb-1">📖 Printer Setup:</div>
                <div>• <strong>Network:</strong> type=<code className="bg-blue-100 px-1 rounded">network</code>, enter IP, port 9100</div>
                <div>• <strong>USB:</strong> type=<code className="bg-blue-100 px-1 rounded">usb</code>, run <code className="bg-blue-100 px-1 rounded">npm install serialport</code></div>
                <div>• <strong>Browser print:</strong> No setup needed — works on any printer</div>
              </div>
            </div>
            <div className="mt-4"><button type="submit" className="btn-primary py-2.5 px-8">💾 Save Settings</button></div>
          </form>
        )}

        {/* GST TAB */}
        {tab==='gst'&&(
          <form onSubmit={saveSettings}>
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div>
                  <div className="font-semibold text-gray-900">Show GST on Receipts</div>
                  <div className="text-sm text-gray-500 mt-0.5">Display CGST + SGST breakup on printed receipts</div>
                </div>
                <button type="button" onClick={()=>setGstEnabled(g=>!g)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${gstEnabled?'bg-green-500':'bg-gray-300'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${gstEnabled?'translate-x-6':'translate-x-1'}`}/>
                </button>
              </div>
              <div className={`p-4 rounded-xl border text-sm ${gstEnabled?'bg-green-50 border-green-200 text-green-800':'bg-gray-50 border-gray-200 text-gray-600'}`}>
                {gstEnabled
                  ? '✅ GST Enabled — GST breakup will show on all receipts'
                  : '⭕ GST Disabled — No GST shown on receipts. Good for non-GST customers.'}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                💡 <strong>Product-level GST:</strong> Set GST Rate = <strong>0%</strong> for any product in Inventory to completely skip GST on that product regardless of this setting.
              </div>
            </div>
            <div className="mt-4"><button type="submit" className="btn-primary py-2.5 px-8">💾 Save Settings</button></div>
          </form>
        )}

        {/* USERS TAB */}
        {tab==='users'&&(
          <div className="space-y-4">
            {userMsg&&<div className={`px-4 py-2.5 rounded-lg text-sm font-medium border ${userMsgType==='ok'?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-800'}`}>{userMsg}</div>}

            {/* Add User Button */}
            <div className="flex justify-end">
              <button onClick={()=>{setShowAddUser(true);setNewUser({...EMPTY_USER});setEditUser(null)}}
                className="btn-primary">+ Add New User</button>
            </div>

            {/* Add User Form */}
            {showAddUser&&(
              <div className="card p-5 border-2 border-brand-200 bg-brand-50/20">
                <h3 className="font-bold text-gray-800 mb-4">➕ Create New User</h3>
                <form onSubmit={createUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Full Name *</label>
                      <input className="input" value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))} placeholder="e.g. Raj Kumar" required/>
                    </div>
                    <div>
                      <label className="label">Username *</label>
                      <input className="input" value={newUser.username} onChange={e=>setNewUser(u=>({...u,username:e.target.value.toLowerCase().replace(/\s/g,'')}))} placeholder="e.g. rajkumar" required/>
                    </div>
                    <div>
                      <label className="label">Password * (min 4 chars)</label>
                      <input type="password" className="input" value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))} placeholder="Min 4 characters" required/>
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <select className="input" value={newUser.role} onChange={e=>setNewUser(u=>({...u,role:e.target.value}))}>
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={userLoading} className="btn-primary flex-1 justify-center disabled:opacity-60">
                      {userLoading?'⏳ Creating...':'✅ Create User'}
                    </button>
                    <button type="button" onClick={()=>{setShowAddUser(false);setNewUser({...EMPTY_USER})}} className="btn-secondary px-6">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit User Form */}
            {editUser&&(
              <div className="card p-5 border-2 border-blue-200 bg-blue-50/20">
                <h3 className="font-bold text-gray-800 mb-4">✏️ Edit User — {editUser.username}</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Full Name</label>
                      <input className="input" value={editUser.name} onChange={e=>setEditUser(u=>u?{...u,name:e.target.value}:null)} placeholder="Full name"/>
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <select className="input" value={editUser.role} onChange={e=>setEditUser(u=>u?{...u,role:e.target.value}:null)}>
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">New Password (leave blank to keep)</label>
                      <input type="password" className="input" value={editPass} onChange={e=>setEditPass(e.target.value)} placeholder="Min 4 characters"/>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editUser.active} onChange={e=>setEditUser(u=>u?{...u,active:e.target.checked}:null)} className="w-4 h-4"/>
                        <span className="text-sm font-medium text-gray-700">Account Active</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={updateUser} disabled={userLoading} className="btn-primary flex-1 justify-center disabled:opacity-60">
                      {userLoading?'⏳ Saving...':'💾 Save Changes'}
                    </button>
                    <button onClick={()=>{setEditUser(null);setEditPass('')}} className="btn-secondary px-6">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700 flex items-center justify-between">
                <span>All Users ({users.length})</span>
              </div>
              {users.length===0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No users found. Run <code className="bg-gray-100 px-1 rounded">npm run db:seed</code> to create defaults.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {users.map(u=>(
                    <div key={u.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${u.role==='admin'?'bg-brand-600':u.role==='manager'?'bg-blue-600':'bg-gray-500'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">@{u.username} · {u.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${u.active?'badge-green':'badge-red'}`}>
                          {u.active?'Active':'Inactive'}
                        </span>
                        <button onClick={()=>{setEditUser(u);setEditPass('');setShowAddUser(false)}}
                          className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                          ✏️ Edit
                        </button>
                        <button onClick={()=>deleteUser(u)}
                          className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium">
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4 text-xs text-gray-500 space-y-1">
              <div className="font-semibold text-gray-700 mb-2">🔐 Password Info</div>
              <div>• Passwords are stored securely (SHA-256 hashed)</div>
              <div>• Minimum 4 characters required</div>
              <div>• Inactive users cannot login</div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-400">
          Developed by <a href="https://www.strydoz.in" target="_blank" className="text-brand-600 hover:underline font-medium">www.strydoz.in</a>
        </div>
      </div>
    </AppLayout>
  )
}
