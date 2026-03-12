import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RiStoreLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()

    const email = String(form.email || '').trim().toLowerCase()
    const password = String(form.password || '').trim()

    if (!email || !password) {
      return
    }

    try {
      const user = await login(email, password)
      if (user.role === 'delivery') navigate('/delivery/dashboard')
      else navigate('/admin/dashboard')
    } catch {}
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Left visual */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 60% 40%, rgba(79,70,229,0.4) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.2) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
            <RiStoreLine className="text-white text-5xl" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Mart<span className="text-indigo-400">Admin</span></h1>
          <p className="text-slate-400 text-lg max-w-sm">Complete retail management — from inventory to delivery, all in one place.</p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {[['📦','Products & Inventory'],['🛒','POS System'],['🚚','Delivery Tracking'],['📊','Reports & Analytics']].map(([e,t]) => (
              <div key={t} className="bg-white/5 rounded-xl p-4 text-left">
                <span className="text-2xl block mb-1">{e}</span>
                <span className="text-slate-400 text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900">Welcome back</h2>
              <p className="text-slate-500 mt-2">Sign in to your admin panel</p>
            </div>
            <form onSubmit={handle} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
                <input className="input-field" type="email" placeholder="admin@mart.com" required
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} autoComplete="username" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input className="input-field pr-10" type={show ? 'text' : 'password'} placeholder="••••••••" required
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})} autoComplete="current-password" />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show ? <RiEyeOffLine /> : <RiEyeLine />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors disabled:opacity-60 mt-2">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-6">Demo: admin@mart.com / Admin@123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
