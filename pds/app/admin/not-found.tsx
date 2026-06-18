'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ShieldOff } from 'lucide-react'

export default function AdminNotFound() {
  const router = useRouter()
  const [n, setN] = React.useState(false)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('nightMode')
      if (saved !== null) setN(JSON.parse(saved))
    } catch {}
  }, [])

  const bg   = n ? '#0f0f0f' : '#f5f3ef'
  const card = n ? '#1a1a1a' : '#ffffff'
  const text = n ? '#f0ede8' : '#1c1917'
  const muted = n ? '#6b7280' : '#9b8ea0'
  const border = n ? '#2a2a2a' : '#ede8e3'

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, fontFamily: "'DM Sans', sans-serif", padding: '1.5rem' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap');`}</style>
      <div style={{ background: card, border: `1.5px solid ${border}`, borderRadius: '20px', padding: '3rem 2.5rem', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: n ? '0 24px 60px rgba(0,0,0,0.4)' : '0 24px 60px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
          <ShieldOff size={28} />
        </div>

        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '4rem', color: '#dc2626', lineHeight: 1, marginBottom: '0.25rem' }}>404</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', color: text, margin: 0 }}>Link Invalido.</h1>
        </div>

        <p style={{ fontSize: '0.9375rem', color: muted, lineHeight: 1.6, margin: 0 }}>
          Pagina não Encontrada.
        </p>

        <button
          onClick={() => router.push('/Parking')}
          style={{ marginTop: '0.5rem', padding: '0.75rem 2rem', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '0.9375rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
        >
          Voltar ao estacionamento
        </button>
      </div>
    </div>
  )
}
