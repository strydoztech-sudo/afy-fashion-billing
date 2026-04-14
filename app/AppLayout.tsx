'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const nav = [
  { href:'/billing',   label:'POS Billing',       icon:'🧾' },
  { href:'/inventory', label:'Inventory',          icon:'📦' },
  { href:'/barcode',   label:'Barcode Generator',  icon:'🔢' },
  { href:'/returns',   label:'Returns',            icon:'🔄' },
  { href:'/customers', label:'Customers',           icon:'👥' },
  { href:'/reports',   label:'Reports',             icon:'📊' },
  { href:'/settings',  label:'Settings',            icon:'⚙️' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path   = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const u = localStorage.getItem('afy_user')
    if (!u) { router.push('/login'); return }
    setUser(JSON.parse(u))
  }, [])

  const logout = () => {
    localStorage.removeItem('afy_user')
    router.push('/login')
  }

  if (!user) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#888',flexDirection:'column',gap:8}}>
      <div style={{width:32,height:32,borderRadius:8,background:'#e11d4a',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700}}>A</div>
      Loading...
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">A</div>
            <div>
              <div className="font-bold text-sm text-gray-900">AFY Fashion</div>
              <div className="text-xs text-gray-400">Billing v2.0</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {nav.map(item => {
            const active = path.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-800">{user.name}</div>
              <div className="text-xs text-gray-400 capitalize">{user.role}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-all font-medium">
            🚪 Logout
          </button>
          <div className="text-xs text-gray-300 text-center">
            <a href="https://www.strydoz.in" target="_blank" className="hover:text-gray-500">strydoz.in</a>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}
