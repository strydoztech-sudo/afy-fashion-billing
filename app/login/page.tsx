'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
      localStorage.setItem('afy_user', JSON.stringify(data.user))
      router.push('/billing')
    } catch { setError('Server error. Try again.'); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400, padding:'0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:72, height:72, background:'#e11d4a', borderRadius:18, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:32, color:'#fff', fontWeight:700, marginBottom:16 }}>
            A
          </div>
          <div style={{ fontSize:28, fontWeight:700, color:'#fff' }}>AFY Fashion</div>
          <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>Billing & POS System</div>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:20, padding:32, boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#111', marginBottom:6 }}>Sign In</h2>
          <p style={{ fontSize:13, color:'#888', marginBottom:24 }}>Enter your credentials to access the system</p>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:500 }}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={login}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Username</label>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)} required
                placeholder="Enter username"
                style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border .15s' }}
                onFocus={e=>(e.target.style.border='1.5px solid #e11d4a')}
                onBlur={e=>(e.target.style.border='1.5px solid #e5e7eb')}
              />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                placeholder="Enter password"
                style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 14px', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border .15s' }}
                onFocus={e=>(e.target.style.border='1.5px solid #e11d4a')}
                onBlur={e=>(e.target.style.border='1.5px solid #e5e7eb')}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', background: loading?'#f87171':'#e11d4a', color:'#fff', border:'none', borderRadius:10, padding:'13px', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', transition:'background .15s' }}>
              {loading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>

          <div style={{ marginTop:24, padding:'14px', background:'#f8fafc', borderRadius:10, fontSize:12, color:'#6b7280' }}>
            <div style={{ fontWeight:700, marginBottom:4, color:'#374151' }}>Default Credentials:</div>
            <div>👤 Admin: <code style={{background:'#e5e7eb',padding:'1px 6px',borderRadius:4}}>admin</code> / <code style={{background:'#e5e7eb',padding:'1px 6px',borderRadius:4}}>admin123</code></div>
            <div style={{marginTop:3}}>👤 Cashier: <code style={{background:'#e5e7eb',padding:'1px 6px',borderRadius:4}}>cashier</code> / <code style={{background:'#e5e7eb',padding:'1px 6px',borderRadius:4}}>cash123</code></div>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#475569' }}>
          Developed by <a href="https://www.strydoz.in" target="_blank" style={{ color:'#e11d4a', textDecoration:'none', fontWeight:600 }}>www.strydoz.in</a>
        </div>
      </div>
    </div>
  )
}
