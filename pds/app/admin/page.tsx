'use client'

export const dynamic = 'force-dynamic'

import React, { Suspense } from 'react'
import { Moon, Sun, LogOut, Car, Trash2, Shield, Users, ParkingSquare, CheckCircle, AlertCircle, X, Clock } from 'lucide-react'
import { getAllSpotsAdmin, adminRemoveParking } from '@/app/actions/parking'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Spot = {
  space: string
  name: string
  plate: string
  user_id: string | null
  created_at: string | null
}

type ToastType = 'success' | 'error'

function formatDuration(createdAt?: string | null): string {
  if (!createdAt) return '—'
  const diffMs = Date.now() - new Date(createdAt).getTime()
  if (diffMs < 0) return '—'
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${minutes}min`
}

function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  const bg = type === 'success' ? '#16a34a' : '#dc2626'
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1.25rem', borderRadius: '12px', background: bg, color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', maxWidth: 'min(440px,calc(100vw - 3rem))', animation: 'toastIn 0.3s ease both' }}>
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: 4, display: 'flex' }}><X size={14} /></button>
    </div>
  )
}

function AdminInner() {
  const router = useRouter()
  const [nightMode, setNightMode] = React.useState(false)
  const [spots, setSpots] = React.useState<Spot[]>([])
  const [loading, setLoading] = React.useState(true)
  const [removingSpace, setRemovingSpace] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<{ message: string; type: ToastType } | null>(null)
  const [confirmSpace, setConfirmSpace] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [, setTick] = React.useState(0)

  const showToast = (message: string, type: ToastType) => setToast({ message, type })

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('nightMode')
      if (saved !== null) setNightMode(JSON.parse(saved))
    } catch {}
  }, [])

  React.useEffect(() => {
    localStorage.setItem('nightMode', JSON.stringify(nightMode))
  }, [nightMode])

  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const loadSpots = React.useCallback(async () => {
    setLoading(true)
    const res = await getAllSpotsAdmin()
    if ('error' in res) {
      if (res.error === 'Unauthorized') router.push('/Parking')
      showToast('Erro ao carregar dados.', 'error')
    } else {
      setSpots(res.spots)
    }
    setLoading(false)
  }, [router])

  React.useEffect(() => { loadSpots() }, [loadSpots])

  const handleRemove = async (space: string) => {
    setRemovingSpace(space)
    const res = await adminRemoveParking(space)
    if ('error' in res) {
      showToast('Erro ao liberar vaga: ' + res.error, 'error')
    } else {
      setSpots(prev => prev.filter(s => s.space !== space))
      showToast(`Vaga ${space.toUpperCase()} liberada com sucesso.`, 'success')
    }
    setRemovingSpace(null)
    setConfirmSpace(null)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = spots.filter(s =>
    s.space.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.plate.toLowerCase().includes(search.toLowerCase())
  )

  const n = nightMode
  const bg          = n ? '#0f0f0f' : '#f5f3ef'
  const card        = n ? '#1a1a1a' : '#ffffff'
  const border      = n ? '#2a2a2a' : '#ede8e3'
  const text        = n ? '#f0ede8' : '#1c1917'
  const muted       = n ? '#6b7280' : '#9b8ea0'
  const inputBg     = n ? '#141414' : '#faf7f4'
  const inputBorder = n ? '#2e2e2e' : '#ddd6cc'

  const totalSpots = 28
  const occupiedCount = spots.length
  const availableCount = totalSpots - occupiedCount

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        body { font-family:'DM Sans',sans-serif; }

        .admin-root { min-height:100svh; display:flex; flex-direction:column; background:${bg}; transition:background 0.3s; }
        .admin-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; background:${n?'rgba(26,26,26,0.92)':'rgba(255,255,255,0.92)'}; border-bottom:1px solid ${n?'#232323':'#e8e3dc'}; backdrop-filter:blur(12px); position:sticky; top:0; z-index:20; }
        .header-brand { display:flex; align-items:center; gap:0.625rem; }
        .header-icon  { width:34px; height:34px; border-radius:9px; background:rgba(220,38,38,0.1); border:1.5px solid rgba(220,38,38,0.2); display:flex; align-items:center; justify-content:center; color:#dc2626; }
        .header-title { font-family:'DM Serif Display',serif; font-size:1.125rem; color:${text}; }
        .header-badge { font-size:0.6875rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; padding:0.2rem 0.5rem; border-radius:999px; background:rgba(220,38,38,0.1); color:#dc2626; border:1px solid rgba(220,38,38,0.2); }
        .header-actions { display:flex; align-items:center; gap:0.5rem; }
        .icon-btn { width:36px; height:36px; border-radius:9px; border:1.5px solid ${border}; background:${card}; color:${muted}; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; }
        .icon-btn:hover { border-color:#3b82f6; color:#3b82f6; }
        .logout-btn { display:flex; align-items:center; gap:0.375rem; padding:0.4375rem 0.875rem; border-radius:9px; border:1.5px solid ${border}; background:${card}; color:${n?'#f87171':'#dc2626'}; font-size:0.8125rem; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.15s; }
        .logout-btn:hover { border-color:#dc2626; background:${n?'rgba(220,38,38,0.08)':'rgba(220,38,38,0.05)'}; }
        .back-btn { display:flex; align-items:center; gap:0.375rem; padding:0.4375rem 0.875rem; border-radius:9px; border:1.5px solid ${border}; background:${card}; color:${muted}; font-size:0.8125rem; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.15s; }
        .back-btn:hover { border-color:#3b82f6; color:#3b82f6; }

        .admin-main { flex:1; padding:2rem 1.5rem; max-width:900px; margin:0 auto; width:100%; animation:fadeIn 0.2s ease both; }

        .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:2rem; }
        .stat-card { background:${card}; border:1.5px solid ${border}; border-radius:14px; padding:1.25rem; display:flex; flex-direction:column; gap:0.375rem; }
        .stat-card-label { font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:${muted}; }
        .stat-card-value { font-family:'DM Serif Display',serif; font-size:2rem; color:${text}; line-height:1; }
        .stat-card-sub { font-size:0.75rem; color:${muted}; }
        .stat-card.green .stat-card-value { color:#16a34a; }
        .stat-card.red   .stat-card-value { color:#dc2626; }
        .stat-card.blue  .stat-card-value { color:#3b82f6; }

        .section-title { font-family:'DM Serif Display',serif; font-size:1.25rem; color:${text}; margin-bottom:1rem; }

        .search-wrap { margin-bottom:1rem; }
        .search-input { width:100%; padding:0.6875rem 1rem; border:1.5px solid ${inputBorder}; border-radius:10px; background:${inputBg}; color:${text}; font-size:0.9375rem; font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.15s; }
        .search-input:focus { border-color:#3b82f6; }
        .search-input::placeholder { color:${muted}; }

        .spots-table { width:100%; border-collapse:collapse; }
        .spots-table th { text-align:left; font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:${muted}; padding:0.625rem 1rem; border-bottom:1.5px solid ${border}; }
        .spots-table td { padding:0.875rem 1rem; border-bottom:1px solid ${border}; font-size:0.875rem; color:${text}; vertical-align:middle; }
        .spots-table tr:last-child td { border-bottom:none; }
        .spots-table tr:hover td { background:${n?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.015)'}; }
        .table-wrap { background:${card}; border:1.5px solid ${border}; border-radius:14px; overflow:hidden; }

        .space-badge { display:inline-flex; align-items:center; gap:0.375rem; font-family:'DM Serif Display',serif; font-size:1rem; color:#dc2626; background:rgba(220,38,38,0.08); padding:0.2rem 0.625rem; border-radius:8px; }
        .plate-badge { font-family:monospace; font-size:0.875rem; font-weight:700; letter-spacing:0.08em; color:${text}; background:${n?'#222':'#f0ede8'}; padding:0.2rem 0.5rem; border-radius:6px; }
        .time-badge { display:inline-flex; align-items:center; gap:0.25rem; font-size:0.8125rem; color:${muted}; }

        .remove-btn { display:inline-flex; align-items:center; gap:0.375rem; padding:0.375rem 0.75rem; border-radius:8px; border:1.5px solid rgba(220,38,38,0.3); background:rgba(220,38,38,0.06); color:#dc2626; font-size:0.8125rem; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.15s; }
        .remove-btn:hover:not(:disabled) { background:rgba(220,38,38,0.15); border-color:#dc2626; }
        .remove-btn:disabled { opacity:0.5; cursor:not-allowed; }

        .confirm-overlay { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:1.5rem; animation:fadeIn 0.15s ease both; }
        .confirm-card { background:${card}; border:1.5px solid ${border}; border-radius:16px; padding:2rem; max-width:360px; width:100%; text-align:center; box-shadow:0 24px 60px rgba(0,0,0,0.2); }
        .confirm-icon { width:48px; height:48px; border-radius:12px; background:rgba(220,38,38,0.1); border:1.5px solid rgba(220,38,38,0.2); display:flex; align-items:center; justify-content:center; color:#dc2626; margin:0 auto 1rem; }
        .confirm-title { font-family:'DM Serif Display',serif; font-size:1.25rem; color:${text}; margin-bottom:0.5rem; }
        .confirm-sub { font-size:0.875rem; color:${muted}; margin-bottom:1.5rem; line-height:1.6; }
        .confirm-actions { display:flex; gap:0.75rem; }
        .confirm-btn { flex:1; padding:0.75rem; border-radius:10px; font-size:0.9375rem; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; border:none; transition:all 0.15s; }
        .confirm-btn.danger { background:#dc2626; color:#fff; }
        .confirm-btn.danger:hover { background:#b91c1c; }
        .confirm-btn.ghost { background:${n?'#232323':'#f5f3ef'}; color:${muted}; border:1.5px solid ${border}; }
        .confirm-btn.ghost:hover { border-color:#3b82f6; color:#3b82f6; }

        .empty-state { text-align:center; padding:3rem 1rem; color:${muted}; }
        .empty-state-icon { font-size:2.5rem; margin-bottom:0.75rem; }
        .empty-state-text { font-size:0.9375rem; }

        .spinner { width:28px; height:28px; border-radius:50%; border:2.5px solid ${border}; border-top-color:#3b82f6; animation:spin 0.7s linear infinite; }
        .loading-wrap { display:flex; align-items:center; justify-content:center; padding:4rem; }

        .refresh-btn { display:flex; align-items:center; gap:0.375rem; padding:0.4375rem 0.875rem; border-radius:9px; border:1.5px solid ${border}; background:${card}; color:${muted}; font-size:0.8125rem; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.15s; }
        .refresh-btn:hover { border-color:#3b82f6; color:#3b82f6; }

        @media (max-width: 600px) {
          .stats-grid { grid-template-columns:1fr 1fr; }
          .stats-grid .stat-card:last-child { grid-column:span 2; }
          .spots-table th:nth-child(4), .spots-table td:nth-child(4) { display:none; }
        }
      `}</style>

      <div className="admin-root">
        <header className="admin-header">
          <div className="header-brand">
            <div className="header-icon"><Shield size={16} /></div>
            <span className="header-title">Admin</span>
            <span className="header-badge">Painel</span>
          </div>
          <div className="header-actions">
            <button className="back-btn" onClick={() => router.push('/Parking')}>
              <ParkingSquare size={14} /> Estacionamento
            </button>
            <button className="icon-btn" onClick={() => setNightMode(p => !p)}>
              {nightMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>

        <main className="admin-main">
          <div className="stats-grid">
            <div className="stat-card red">
              <span className="stat-card-label">Ocupadas</span>
              <span className="stat-card-value">{occupiedCount}</span>
              <span className="stat-card-sub">de {totalSpots} vagas</span>
            </div>
            <div className="stat-card green">
              <span className="stat-card-label">Disponíveis</span>
              <span className="stat-card-value">{availableCount}</span>
              <span className="stat-card-sub">{Math.round((availableCount / totalSpots) * 100)}% livre</span>
            </div>
            <div className="stat-card blue">
              <span className="stat-card-label">Ocupação</span>
              <span className="stat-card-value">{Math.round((occupiedCount / totalSpots) * 100)}%</span>
              <span className="stat-card-sub">taxa atual</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span className="section-title">Vagas ocupadas</span>
            <button className="refresh-btn" onClick={loadSpots}>↻ Atualizar</button>
          </div>

          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Buscar por vaga, nome ou placa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🅿️</div>
              <div className="empty-state-text">
                {spots.length === 0 ? 'Nenhuma vaga ocupada no momento.' : 'Nenhum resultado para a busca.'}
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="spots-table">
                <thead>
                  <tr>
                    <th>Vaga</th>
                    <th>Nome</th>
                    <th>Placa</th>
                    <th>Tempo</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(spot => (
                    <tr key={spot.space}>
                      <td>
                        <span className="space-badge">
                          <Car size={12} />
                          {spot.space.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{spot.name}</td>
                      <td><span className="plate-badge">{spot.plate}</span></td>
                      <td>
                        <span className="time-badge">
                          <Clock size={12} />
                          {formatDuration(spot.created_at)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="remove-btn"
                          disabled={removingSpace === spot.space}
                          onClick={() => setConfirmSpace(spot.space)}
                        >
                          <Trash2 size={13} />
                          {removingSpace === spot.space ? 'Liberando...' : 'Liberar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {confirmSpace && (
          <div className="confirm-overlay" onClick={() => setConfirmSpace(null)}>
            <div className="confirm-card" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon"><Trash2 size={20} /></div>
              <div className="confirm-title">Liberar vaga {confirmSpace.toUpperCase()}?</div>
              <div className="confirm-sub">
                Ocupada por <strong>{spots.find(s => s.space === confirmSpace)?.name}</strong> ({spots.find(s => s.space === confirmSpace)?.plate}).
                Esta ação não pode ser desfeita.
              </div>
              <div className="confirm-actions">
                <button className="confirm-btn ghost" onClick={() => setConfirmSpace(null)}>Cancelar</button>
                <button className="confirm-btn danger" onClick={() => handleRemove(confirmSpace)}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminInner />
    </Suspense>
  )
}