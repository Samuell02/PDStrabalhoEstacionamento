'use client'

import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { useActionState, useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined)
  const [showPopup, setShowPopup] = useState(false)

  const [night, setNight] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('nightMode')
      return saved !== null ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  useEffect(() => {
    localStorage.setItem('nightMode', JSON.stringify(night))
  }, [night])

  useEffect(() => {
    if (state?.success) setShowPopup(true)
  }, [state])

  const bg = night ? '#1a1a1a' : '#FFF5F2'
  const card = night ? '#262626' : '#ffffff'
  const text = night ? '#f3f4f6' : '#1a1a1a'
  const muted = '#9ca3af'
  const label = night ? '#d1d5db' : '#374151'
  const inputBg = night ? '#1f1f1f' : '#fafafa'
  const inputBorder = night ? '#3f3f46' : '#e5e7eb'
  const inputText = night ? '#f3f4f6' : '#1a1a1a'
  const logoBorder = night ? '#3f3f46' : '#cbd5e1'
  const logoBg = night ? '#27272a' : '#f8fafc'
  const logoText = night ? '#71717a' : '#94a3b8'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 transition-colors duration-300"
      style={{ backgroundColor: bg }}
    >
      <div aria-hidden style={{ position: 'fixed', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: night ? 'rgba(59,130,246,0.08)' : 'rgba(147,197,253,0.18)', filter: 'blur(48px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'fixed', bottom: '-60px', left: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: night ? 'rgba(59,130,246,0.06)' : 'rgba(96,165,250,0.13)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <button
        onClick={() => setNight((p: boolean) => !p)}
        style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', background: card, border: `1.5px solid ${inputBorder}`, borderRadius: '10px', padding: '0.5rem', cursor: 'pointer', color: night ? '#f3f4f6' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 100, transition: 'background 0.3s, border-color 0.3s' }}
      >
        {night ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div style={{ background: card, borderRadius: '16px', padding: '2rem', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '2rem' }}>📧</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: text, margin: 0 }}>Confirme seu email</h3>
            <p style={{ fontSize: '0.875rem', color: muted, margin: 0, lineHeight: '1.6' }}>
              Enviamos um link de confirmação para seu email. Verifique sua caixa de entrada antes de fazer login.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.625rem 1.5rem', fontSize: '0.9375rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.25rem', boxShadow: '0 4px 12px rgba(59,130,246,0.25)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <form
        action={action}
        style={{ width: '100%', maxWidth: '420px', background: card, borderRadius: '20px', padding: '2.5rem 2rem', boxShadow: night ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', transition: 'background 0.3s, box-shadow 0.3s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>
          {/* Replace this div with your <Image> or <img> logo */}
          <div style={{ width: '72px', height: '72px', borderRadius: '16px', border: `2px dashed ${logoBorder}`, background: logoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: logoText, fontSize: '0.6875rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'background 0.3s, border-color 0.3s' }}>
            Logo
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: text, margin: 0, letterSpacing: '-0.02em', transition: 'color 0.3s' }}>Crie uma conta</h2>
          <p style={{ fontSize: '0.875rem', color: muted, marginTop: '0.25rem' }}>Acesse o sistema de estacionamento</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: label, transition: 'color 0.3s' }}>Nome</label>
          <input
            name="name" placeholder="John Doe"
            style={{ border: `1.5px solid ${inputBorder}`, borderRadius: '10px', padding: '0.625rem 0.875rem', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.15s, background 0.3s', color: inputText, background: inputBg }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
          />
          {state?.errors?.name && <p style={{ fontSize: '0.8125rem', color: '#ef4444', margin: 0 }}>{state.errors.name}</p>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: label, transition: 'color 0.3s' }}>Email</label>
          <input
            name="email" placeholder="voce@exemplo.com"
            style={{ border: `1.5px solid ${inputBorder}`, borderRadius: '10px', padding: '0.625rem 0.875rem', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.15s, background 0.3s', color: inputText, background: inputBg }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
          />
          {state?.errors?.email && <p style={{ fontSize: '0.8125rem', color: '#ef4444', margin: 0 }}>{state.errors.email}</p>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: label, transition: 'color 0.3s' }}>Senha</label>
          <input
            name="password" type="password" placeholder="••••••••"
            style={{ border: `1.5px solid ${inputBorder}`, borderRadius: '10px', padding: '0.625rem 0.875rem', fontSize: '0.9375rem', outline: 'none', transition: 'border-color 0.15s, background 0.3s', color: inputText, background: inputBg }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
          />
          {state?.errors?.password && (
            <div style={{ fontSize: '0.8125rem', color: '#ef4444', margin: 0 }}>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {state.errors.password.map((error: string) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          disabled={pending} type="submit"
          style={{ width: '100%', background: pending ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem', fontSize: '0.9375rem', fontWeight: '600', cursor: pending ? 'not-allowed' : 'pointer', transition: 'background 0.15s', marginTop: '0.25rem', boxShadow: pending ? 'none' : '0 4px 12px rgba(59,130,246,0.25)', letterSpacing: '0.01em' }}
          onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = '#2563eb' }}
          onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = '#3b82f6' }}
        >
          {pending ? 'Criando conta...' : 'Criar conta'}
        </button>

        <p style={{ fontSize: '0.875rem', color: muted, textAlign: 'center', margin: 0 }}>
          Já tem uma conta?{' '}
          <Link href="/login" style={{ color: '#3b82f6', fontWeight: '600', textDecoration: 'none' }}>Entrar</Link>
        </p>
      </form>
    </div>
  )
}