'use client'
// app/customers/page.tsx
import { useState, useEffect } from 'react'
import AppLayout from '../AppLayout'
import { formatDateTime } from '@/lib/utils'

interface Customer {
  id: string; name: string; phone: string; email?: string
  address?: string; gstNumber?: string; points: number
  createdAt: string
  _count?: { bills: number }
}

const emptyForm = { name: '', phone: '', email: '', address: '', gstNumber: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const res = await fetch('/api/customers')
    if (res.ok) setCustomers(await res.json())
  }

  useEffect(() => { load() }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').includes(q)
  })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editId ? 'PUT' : 'POST'
    const url = editId ? `/api/customers/${editId}` : '/api/customers'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    if (res.ok) {
      setMsg(editId ? '✅ Updated' : '✅ Customer added'); load()
      setShowForm(false); setForm({ ...emptyForm }); setEditId(null)
    } else setMsg('❌ Failed')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-gray-500">{customers.length} registered customers</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }) }}
            className="btn-primary">+ Add Customer</button>
        </div>

        {msg && <div className="mb-4 px-3 py-2 bg-gray-50 border rounded-lg text-sm">{msg}</div>}

        <input type="text" placeholder="🔍 Search by name, phone or email..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input max-w-sm mb-4" />

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">GST No.</th>
                <th className="px-4 py-3 text-right">Bills</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-left">Since</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="group hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.gstNumber || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm">{c._count?.bills ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="badge badge-blue">{c.points} pts</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '', gstNumber: c.gstNumber || '' }); setEditId(c.id); setShowForm(true) }}
                      className="opacity-0 group-hover:opacity-100 btn-secondary text-xs py-1 px-2">Edit</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">{editId ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input required className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label">GST Number</label>
                <input className="input" value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">{editId ? 'Update' : 'Add Customer'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
