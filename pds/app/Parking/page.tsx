'use client'

export const dynamic = 'force-dynamic'

import React, { Suspense } from 'react'
import { Moon, Sun, LogOut, CreditCard, QrCode, FileText, Car, X, CheckCircle, AlertCircle, AlertTriangle, Clock, Eye, EyeOff, Shield } from 'lucide-react'
import {
  createCheckoutSession,
  getParkings,
  removeParking,
  verifyAndFinalizeSession,
} from '@/app/actions/parking'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

type ParkingSpot = { name: string; plate: string; createdAt?: string }
type PaymentMethod = 'card' | 'pix' | 'boleto'
type ToastType = 'success' | 'error' | 'pending'
type ModalStep = 'info' | 'payment' | 'processing'
type SpotFilter = 'all' | 'available' | 'occupied'

// ─── CPF formatter ────────────────────────────────────────────────────────────
function formatCpf(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// ─── Time elapsed formatter ───────────────────────────────────────────────────
function formatDuration(createdAt?: string): string | null {
  if (!createdAt) return null
  const start = new Date(createdAt).getTime()
  if (Number.isNaN(start)) return null

  const diffMs = Date.now() - start
  if (diffMs < 0) return null

  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${minutes}min`
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: ToastType
  onClose: () => void
}) {
  React.useEffect(() => {
    const t = setTimeout(onClose, type === 'pending' ? 8000 : 4000)
    return () => clearTimeout(t)
  }, [onClose, type])

  const bg   = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#d97706'
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Clock

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        background: bg,
        color: '#fff',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        maxWidth: 'min(440px, calc(100vw - 3rem))',
        lineHeight: 1.5,
      }}
    >
      <Icon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ overflow: 'hidden' }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: 4, display: 'flex', flexShrink: 0 }}
      >
        <X size={15} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
function ParkingInner() {
  const rows = ['a', 'b']
  const columns = Array.from({ length: 14 }, (_, i) => i + 1)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedSpace, setSelectedSpace] = React.useState<string | null>(null)
  const [modalStep, setModalStep] = React.useState<ModalStep>('info')
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('card')
  const [nightMode, setNightMode] = React.useState(false)
  const [name, setName] = React.useState('')
  const [plate, setPlate] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [parkedSpaces, setParkedSpaces] = React.useState<Record<string, ParkingSpot>>({})
  const [mySpace, setMySpace] = React.useState('')
  const [myName, setMyName] = React.useState('')
  const [myPlate, setMyPlate] = React.useState('')
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [toast, setToast] = React.useState<{ message: string; type: ToastType } | null>(null)
  const [spotFilter, setSpotFilter] = React.useState<SpotFilter>('all')
  const [hiddenRows, setHiddenRows] = React.useState<string[]>([])

  const toggleRowVisibility = (row: string) => {
    setHiddenRows(prev => {
      const next = prev.includes(row) ? prev.filter(r => r !== row) : [...prev, row]
      localStorage.setItem('hiddenRows', JSON.stringify(next))
      return next
    })
  }

  // Re-render every minute so "ocupada há Xmin" stays up to date
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type })

  // cpf — only required for boleto
  const [cpf, setCpf] = React.useState('')

  // ── Restore localStorage ──────────────────────────────────────────────────
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('nightMode')
      if (saved !== null) setNightMode(JSON.parse(saved))
    } catch {}

    const savedSpace = localStorage.getItem('mySpace')
    if (savedSpace) setMySpace(savedSpace)
    const savedName = localStorage.getItem('myName')
    if (savedName) setMyName(savedName)
    const savedPlate = localStorage.getItem('myPlate')
    if (savedPlate) setMyPlate(savedPlate)

    try {
      const savedHidden = localStorage.getItem('hiddenRows')
      if (savedHidden) setHiddenRows(JSON.parse(savedHidden))
    } catch {}
  }, [])

  React.useEffect(() => {
    localStorage.setItem('nightMode', JSON.stringify(nightMode))
  }, [nightMode])

  // ── Load spots ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function loadSpaces() {
      const res = await getParkings()
      if (res?.isAdmin) setIsAdmin(true)
      if (res?.data) {
        const mapped: Record<string, ParkingSpot> = {}
        for (const row of res.data as unknown as { space: string; name?: string; plate?: string; created_at?: string }[]) {
          mapped[row.space] = { name: row.name ?? '', plate: row.plate ?? '', createdAt: row.created_at }
        }
        setParkedSpaces(mapped)
      }
      // Use server-returned mySpace (identified by user_id) — more reliable than localStorage
      if (res && 'mySpace' in res && res.mySpace) {
        setMySpace(res.mySpace as string)
        localStorage.setItem('mySpace', res.mySpace as string)
      }
      setInitialLoading(false)
       console.log('DEBUG getParkings:', JSON.stringify(res)) 
    }
    loadSpaces()
  }, [])

  // ── Handle Stripe return redirect ─────────────────────────────────────────
  React.useEffect(() => {
    const status = searchParams.get('status')
    const sessionId = searchParams.get('session_id')
    const space = searchParams.get('space')

    if (!status) return

    // Clean up URL
    router.replace('/Parking', { scroll: false })

    if (status === 'cancelled') {
      showToast('Pagamento cancelado. Nenhuma cobrança foi realizada.', 'error')
      return
    }

    if (status === 'success' && sessionId && space) {
      ;(async () => {
        const res = await verifyAndFinalizeSession(sessionId)
        if (!res || 'error' in res) {
          showToast('Pagamento confirmado, mas houve um erro ao salvar a vaga. Contate o suporte.', 'error')
          return
        }

        const { space: s, name: n, plate: p } = res
        const isPending = 'isPending' in res && res.isPending

        setParkedSpaces((prev) => ({ ...prev, [s]: { name: n, plate: p } }))
        setMySpace(s)
        setMyName(n)
        setMyPlate(p)
        localStorage.setItem('mySpace', s)
        localStorage.setItem('myName', n)
        localStorage.setItem('myPlate', p)

        if (isPending) {
          // Boleto: spot held in UI, but webhook confirms when bank payment arrives
          showToast(
            `Boleto emitido! Pague em até 3 dias úteis para confirmar a vaga ${s.toUpperCase()}.`,
            'pending',
          )
        } else {
          showToast(`Vaga ${s.toUpperCase()} reservada com sucesso!`, 'success')
        }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isOccupied = (space: string) => !!parkedSpaces[space]
  const isMySpot = (space: string) => mySpace === space && !!mySpace

  const openModal = (space: string) => {
    // Limit: one spot per user — block reserving a new available spot
    // if the user already has one (their own spot can still be opened to free it)
    if (mySpace && mySpace !== space && !isOccupied(space)) {
      showToast(`Você já possui a vaga ${mySpace.toUpperCase()} reservada. Libere-a antes de reservar outra.`, 'error')
      return
    }

    setSelectedSpace(space)
    setModalStep('info')
    setName('')
    setPlate('')
    setCpf('')
    setPaymentMethod('card')
  }

  const closeModal = () => {
    setSelectedSpace(null)
    setModalStep('info')
    setName('')
    setPlate('')
    setCpf('')
  }

  // ── Submit: go to Stripe Checkout ─────────────────────────────────────────
  const handleCheckout = async () => {
    if (!name.trim() || !plate.trim() || !selectedSpace) {
      showToast('Preencha nome e placa antes de continuar.', 'error')
      return
    }

    if (paymentMethod === 'boleto' && cpf.replace(/\D/g, '').length !== 11) {
      showToast('Informe um CPF válido para pagamento via boleto.', 'error')
      return
    }

    setLoading(true)
    setModalStep('processing')

    const res = await createCheckoutSession(
      selectedSpace,
      name.trim(),
      plate.trim().toUpperCase(),
      paymentMethod,
      paymentMethod === 'boleto' ? cpf : undefined,
    )
    setLoading(false)

    if (!res || 'error' in res) {
      showToast('Erro ao iniciar pagamento: ' + (res && 'error' in res ? res.error : 'Erro desconhecido'), 'error')
      setModalStep('payment')
      return
    }

    if ('url' in res && res.url) {
      window.location.href = res.url
    }
  }

  // ── Remove ────────────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!selectedSpace) return
    setLoading(true)
    const res = await removeParking(selectedSpace)
    setLoading(false)

    if (!res || 'error' in res) {
      showToast('Erro ao liberar: ' + (res && 'error' in res ? res.error : 'Erro desconhecido'), 'error')
      return
    }

    setParkedSpaces((prev) => { const n = { ...prev }; delete n[selectedSpace]; return n })
    setMySpace(''); setMyName(''); setMyPlate('')
    localStorage.removeItem('mySpace')
    localStorage.removeItem('myName')
    localStorage.removeItem('myPlate')

    showToast('Vaga liberada com sucesso!', 'success')
    closeModal()
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedIsOccupied = selectedSpace ? isOccupied(selectedSpace) : false
  const selectedIsMySpot = selectedSpace ? isMySpot(selectedSpace) : false
  const totalSpots = rows.length * columns.length
  const occupiedCount = Object.keys(parkedSpaces).length
  const availableCount = totalSpots - occupiedCount
  const n = nightMode

  const getOccupiedMessage = () => {
    const duration = selectedSpace ? formatDuration(parkedSpaces[selectedSpace]?.createdAt) : null
    const durationSuffix = duration ? ` há ${duration}` : ''

    if (selectedIsMySpot) return `Sua vaga — ${myName} (${myPlate})${duration ? ` · ocupada há ${duration}` : ''}`
    if (!selectedIsOccupied) return 'Esta vaga está disponível.'
    if (isAdmin && selectedSpace) return `Ocupada por ${parkedSpaces[selectedSpace]?.name} (${parkedSpaces[selectedSpace]?.plate})${duration ? ` · há ${duration}` : ''}`
    return `Esta vaga está ocupada${durationSuffix}.`
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const colors = {
    bg: n ? '#0f0f0f' : '#f5f3ef',
    card: n ? '#1a1a1a' : '#ffffff',
    cardBorder: n ? '#2a2a2a' : '#ede8e3',
    text: n ? '#f0ede8' : '#1c1917',
    muted: n ? '#6b7280' : '#9b8ea0',
    inputBg: n ? '#141414' : '#faf7f4',
    inputBorder: n ? '#2e2e2e' : '#ddd6cc',
    inputText: n ? '#f0ede8' : '#1c1917',
    headerBg: n ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.92)',
    headerBorder: n ? '#232323' : '#e8e3dc',
    statsBg: n ? '#141414' : '#faf7f3',
    statsBorder: n ? '#1e1e1e' : '#ece7df',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn   { from { opacity: 0; transform: scale(0.94) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        body { font-family: 'DM Sans', sans-serif; }

        .park-root {
          min-height: 100svh; display: flex; flex-direction: column;
          background: var(--bg-color); transition: background 0.4s; position: relative;
        }
        .park-root::before {
          content: ''; position: fixed; inset: 0;
          background-image:
            linear-gradient(${n ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.025)'} 1px, transparent 1px),
            linear-gradient(90deg, ${n ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.025)'} 1px, transparent 1px);
          background-size: 40px 40px; pointer-events: none; z-index: 0;
        }

        /* Header */
        .park-header {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.5rem;
          background: ${colors.headerBg}; border-bottom: 1px solid ${colors.headerBorder};
          backdrop-filter: blur(12px);
        }
        .header-brand { display: flex; align-items: center; gap: 0.625rem; }
        .header-icon { width: 34px; height: 34px; border-radius: 9px; background: rgba(59,130,246,0.1); border: 1.5px solid rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; color: #3b82f6; }
        .header-title { font-family: 'DM Serif Display', serif; font-size: 1.125rem; color: ${colors.text}; }
        .header-actions { display: flex; align-items: center; gap: 0.5rem; }
        .icon-btn { width: 36px; height: 36px; border-radius: 9px; border: 1.5px solid ${colors.cardBorder}; background: ${colors.card}; color: ${colors.muted}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
        .icon-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .logout-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; border-radius: 9px; border: 1.5px solid ${colors.cardBorder}; background: ${colors.card}; color: ${n ? '#f87171' : '#dc2626'}; font-size: 0.8125rem; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; }
        .logout-btn:hover { border-color: #dc2626; background: ${n ? 'rgba(220,38,38,0.08)' : 'rgba(220,38,38,0.05)'}; }
        .admin-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; border-radius: 9px; border: 1.5px solid rgba(220,38,38,0.35); background: rgba(220,38,38,0.08); color: #dc2626; font-size: 0.8125rem; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; }
        .admin-btn:hover { background: rgba(220,38,38,0.15); border-color: #dc2626; }

        /* Stats bar */
        .stats-bar { position: relative; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 1.5rem; padding: 0.75rem 1.5rem; background: ${colors.statsBg}; border-bottom: 1px solid ${colors.statsBorder}; flex-wrap: wrap; }
        .low-availability-banner { position: relative; z-index: 6; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 1.5rem; background: ${n ? 'rgba(217,119,6,0.15)' : '#fff7ed'}; border-bottom: 1px solid ${n ? 'rgba(217,119,6,0.3)' : '#fed7aa'}; color: ${n ? '#fdba74' : '#c2410c'}; font-size: 0.8125rem; font-weight: 600; text-align: center; animation: fadeIn 0.3s ease both; }
        .low-availability-banner.critical { background: ${n ? 'rgba(220,38,38,0.15)' : '#fef2f2'}; border-bottom-color: ${n ? 'rgba(220,38,38,0.3)' : '#fecaca'}; color: ${n ? '#fca5a5' : '#dc2626'}; }
        .stat-pill { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 500; color: ${colors.muted}; }
        .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .stat-dot.green { background: #22c55e; box-shadow: 0 0 6px #22c55e60; }
        .stat-dot.red   { background: #ef4444; box-shadow: 0 0 6px #ef444460; }
        .stat-dot.blue  { background: #3b82f6; box-shadow: 0 0 6px #3b82f660; }
        .stat-val { font-weight: 600; color: ${colors.text}; }
        .stat-sep { width: 1px; height: 16px; background: ${colors.cardBorder}; }

        /* Main */
        .park-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem 1.5rem; position: relative; z-index: 5; overflow: auto; }
        .grid-wrapper { width: 100%; max-width: 640px; }
        .filter-bar { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .filter-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; border-radius: 999px; border: 1.5px solid ${colors.cardBorder}; background: ${colors.card}; color: ${colors.muted}; font-size: 0.8125rem; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; }
        .filter-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .filter-btn.active { border-color: #3b82f6; background: rgba(59,130,246,0.1); color: #3b82f6; font-weight: 600; }
        .filter-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .filter-dot.green { background: #22c55e; }
        .filter-dot.red   { background: #ef4444; }
        .filter-dot.all   { background: ${colors.muted}; }
        .empty-filter { text-align: center; padding: 2rem 1rem; color: ${colors.muted}; font-size: 0.875rem; }
        .row-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${n ? '#4b5563' : '#a8a29e'}; margin-bottom: 0.5rem; padding-left: 0.25rem; display: flex; align-items: center; justify-content: space-between; }
        .row-toggle { display: flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 999px; border: 1.5px solid #3b82f6; background: rgba(59,130,246,0.08); color: #3b82f6; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; }
        .row-toggle:hover { background: rgba(59,130,246,0.18); }
        .hidden-rows-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
        .hidden-row-chip { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.875rem; border-radius: 999px; border: 1.5px dashed ${colors.cardBorder}; background: ${colors.card}; color: ${colors.muted}; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .hidden-row-chip:hover { border-color: #3b82f6; color: #3b82f6; }
        .spot-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; margin-bottom: 1.5rem; }

        .spot-btn { aspect-ratio: 1 / 1.2; border-radius: 10px; border: 1.5px solid transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; font-family: 'DM Sans', sans-serif; }
        .spot-btn::after { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.08); opacity: 0; transition: opacity 0.15s; }
        .spot-btn:hover::after { opacity: 1; }
        .spot-btn:hover { transform: translateY(-2px); }
        .spot-btn:active { transform: translateY(0); }
        .spot-label { font-size: 0.75rem; font-weight: 600; color: #fff; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1; }

        .spot-available { background: ${n ? '#14532d' : '#16a34a'}; border-color: ${n ? '#166534' : '#15803d'}; box-shadow: 0 2px 8px rgba(22,163,74,0.25); }
        .spot-occupied  { background: ${n ? '#7f1d1d' : '#dc2626'}; border-color: ${n ? '#991b1b' : '#b91c1c'}; box-shadow: 0 2px 8px rgba(220,38,38,0.25); }
        .spot-mine      { background: ${n ? '#1e3a8a' : '#2563eb'}; border-color: ${n ? '#1d4ed8' : '#1d4ed8'}; box-shadow: 0 2px 8px rgba(37,99,235,0.35); }

        /* Loading */
        .loading-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid ${n ? '#232323' : '#e5e0d8'}; border-top-color: #3b82f6; animation: spin 0.7s linear infinite; }
        .loading-text { font-size: 0.875rem; color: ${colors.muted}; }

        /* Modal overlay */
        .modal-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; animation: fadeIn 0.15s ease both; }
        .modal-card { width: 100%; max-width: 420px; background: ${colors.card}; border: 1.5px solid ${colors.cardBorder}; border-radius: 20px; padding: 1.75rem; box-shadow: ${n ? '0 32px 64px rgba(0,0,0,0.6)' : '0 24px 60px rgba(0,0,0,0.15)'}; animation: popIn 0.25s cubic-bezier(0.16,1,0.3,1) both; }

        /* Modal header */
        .modal-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
        .modal-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
        .badge-available { background: rgba(22,163,74,0.12); color: #16a34a; }
        .badge-occupied  { background: rgba(220,38,38,0.1);  color: #dc2626; }
        .badge-mine      { background: rgba(37,99,235,0.12); color: #2563eb; }
        .modal-close { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid ${colors.cardBorder}; background: transparent; color: ${colors.muted}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .modal-close:hover { border-color: #ef4444; color: #ef4444; }

        .modal-title { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: ${colors.text}; margin-bottom: 0.25rem; }
        .modal-sub { font-size: 0.875rem; color: ${colors.muted}; margin-bottom: 1.25rem; }

        /* Info step inputs */
        .input-group { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 0.875rem; }
        .input-label { font-size: 0.8125rem; font-weight: 500; color: ${n ? '#c4bdb7' : '#44403c'}; }
        .modal-input { width: 100%; border: 1.5px solid ${colors.inputBorder}; border-radius: 10px; padding: 0.6875rem 0.875rem; font-size: 0.9375rem; font-family: 'DM Sans', sans-serif; outline: none; color: ${colors.inputText}; background: ${colors.inputBg}; transition: border-color 0.15s, box-shadow 0.15s; }
        .modal-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .modal-input::placeholder { color: ${n ? '#3d3d3d' : '#c4bcb4'}; }

        /* Payment method picker */
        .pay-section-label { font-size: 0.8125rem; font-weight: 600; color: ${n ? '#c4bdb7' : '#44403c'}; margin-bottom: 0.625rem; letter-spacing: 0.01em; }
        .pay-methods { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-bottom: 1.125rem; }
        .pay-method-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 0.3rem;
          padding: 0.875rem 0.375rem 0.75rem; border-radius: 12px; cursor: pointer; transition: all 0.15s;
          border: 2px solid ${colors.cardBorder}; background: ${colors.inputBg};
          font-family: 'DM Sans', sans-serif; text-align: center;
        }
        .pay-method-btn:hover { border-color: #3b82f6; }
        .pay-method-btn.selected-card   { border-color: #3b82f6; background: rgba(59,130,246,0.08); }
        .pay-method-btn.selected-pix    { border-color: #009879; background: rgba(0,152,121,0.08); }
        .pay-method-btn.selected-boleto { border-color: #d97706; background: rgba(217,119,6,0.08); }
        .pay-method-name { font-size: 0.8125rem; font-weight: 600; color: ${colors.text}; }
        .pay-method-desc { font-size: 0.6875rem; color: ${colors.muted}; }
        .pay-method-badge {
          font-size: 0.6rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
          padding: 0.15rem 0.45rem; border-radius: 999px; margin-top: 0.15rem;
        }
        .badge-instant { background: rgba(22,163,74,0.12);  color: #16a34a; }
        .badge-pix     { background: rgba(0,152,121,0.12);  color: #009879; }
        .badge-boleto  { background: rgba(217,119,6,0.12);  color: #d97706; }

        /* CPF field — only shown for boleto */
        .cpf-info { font-size: 0.8125rem; color: #92400e; background: ${n ? 'rgba(217,119,6,0.1)' : '#fefce8'}; border: 1px solid ${n ? 'rgba(217,119,6,0.25)' : '#fde68a'}; border-radius: 8px; padding: 0.625rem 0.875rem; margin-bottom: 0.875rem; line-height: 1.5; }

        /* Price summary */
        .price-summary {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.875rem 1rem; border-radius: 10px;
          background: ${n ? '#141414' : '#f5f3ef'}; border: 1px solid ${colors.cardBorder};
          margin-bottom: 1.25rem;
        }
        .price-label { font-size: 0.875rem; color: ${colors.muted}; }
        .price-value { font-size: 1.125rem; font-weight: 700; color: ${colors.text}; font-family: 'DM Serif Display', serif; }

        /* Processing state */
        .processing-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 1.5rem 0; text-align: center; }
        .processing-spinner { width: 48px; height: 48px; border-radius: 50%; border: 3px solid ${n ? '#232323' : '#e5e0d8'}; border-top-color: #3b82f6; animation: spin 0.7s linear infinite; }
        .processing-title { font-family: 'DM Serif Display', serif; font-size: 1.25rem; color: ${colors.text}; }
        .processing-sub { font-size: 0.875rem; color: ${colors.muted}; }

        /* Buttons */
        .modal-btn { width: 100%; border: none; border-radius: 10px; padding: 0.8125rem; font-size: 0.9375rem; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn-primary { background: #3b82f6; color: #fff; box-shadow: 0 4px 14px rgba(59,130,246,0.3); }
        .btn-primary:not(:disabled):hover { background: #2563eb; transform: translateY(-1px); }
        .btn-success { background: #16a34a; color: #fff; box-shadow: 0 4px 12px rgba(22,163,74,0.3); }
        .btn-success:not(:disabled):hover { background: #15803d; transform: translateY(-1px); }
        .btn-amber { background: #d97706; color: #fff; box-shadow: 0 4px 12px rgba(217,119,6,0.3); }
        .btn-amber:not(:disabled):hover { background: #b45309; transform: translateY(-1px); }
        .btn-danger { background: #dc2626; color: #fff; box-shadow: 0 4px 12px rgba(220,38,38,0.25); }
        .btn-danger:not(:disabled):hover { background: #b91c1c; transform: translateY(-1px); }
        .btn-ghost { background: ${n ? '#232323' : '#f5f3ef'}; border: 1.5px solid ${colors.cardBorder}; color: ${colors.muted}; }
        .btn-ghost:hover { border-color: #3b82f6; color: #3b82f6; }
        .modal-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

        /* Divider */
        .divider { height: 1px; background: ${colors.cardBorder}; margin: 1rem 0; }

        /* Secure badge */
        .secure-row { display: flex; align-items: center; justify-content: center; gap: 0.375rem; margin-top: 0.25rem; }
        .secure-text { font-size: 0.75rem; color: ${colors.muted}; }
      `}</style>

      <div className="park-root">
        {/* ── Header ── */}
        <header className="park-header">
          <div className="header-brand">
            <div className="header-icon"><Car size={16} /></div>
            <span className="header-title">Sistema De Estacionamento da Ulbra</span>
          </div>
          <div className="header-actions">
            {isAdmin && (
              <button className="admin-btn" onClick={() => router.push('/admin')}>
                <Shield size={14} /> Admin
              </button>
            )}
            <button className="icon-btn" onClick={() => setNightMode(p => !p)} aria-label="Toggle theme">
              {nightMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>

        {/* ── Low availability banner ── */}
        {!initialLoading && availableCount > 0 && availableCount <= 5 && (
          <div className={`low-availability-banner ${availableCount <= 2 ? 'critical' : ''}`}>
            <AlertTriangle size={15} />
            <span>
              {availableCount === 1
                ? 'Resta apenas 1 vaga! Reserve agora antes que acabe.'
                : `Restam apenas ${availableCount} vagas! Reserve agora antes que acabem.`}
            </span>
          </div>
        )}

        {!initialLoading && availableCount === 0 && (
          <div className="low-availability-banner critical">
            <AlertTriangle size={15} />
            <span>Estacionamento lotado! Todas as vagas estão ocupadas.</span>
          </div>
        )}

        {/* ── Stats bar ── */}
        {!initialLoading && (
          <div className="stats-bar">
            <div className="stat-pill">
              <span className="stat-dot green" />
              <span className="stat-val">{availableCount}</span>
              <span>disponíveis</span>
            </div>
            <span className="stat-sep" />
            <div className="stat-pill">
              <span className="stat-dot red" />
              <span className="stat-val">{occupiedCount}</span>
              <span>ocupadas</span>
            </div>
            {mySpace && (
              <>
                <span className="stat-sep" />
                <div className="stat-pill">
                  <span className="stat-dot blue" />
                  <span>Sua vaga: <span className="stat-val">{mySpace.toUpperCase()}</span></span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Grid ── */}
        <main className="park-main">
          {initialLoading ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <span className="loading-text">Carregando vagas...</span>
            </div>
          ) : (
            <div className="grid-wrapper">
              {/* Filter bar */}
              <div className="filter-bar">
                <button className={`filter-btn ${spotFilter === 'all' ? 'active' : ''}`} onClick={() => setSpotFilter('all')}>
                  <span className="filter-dot all" /> Todas ({totalSpots})
                </button>
                <button className={`filter-btn ${spotFilter === 'available' ? 'active' : ''}`} onClick={() => setSpotFilter('available')}>
                  <span className="filter-dot green" /> Disponíveis ({availableCount})
                </button>
                <button className={`filter-btn ${spotFilter === 'occupied' ? 'active' : ''}`} onClick={() => setSpotFilter('occupied')}>
                  <span className="filter-dot red" /> Ocupadas ({occupiedCount})
                </button>
              </div>

              {rows.filter(row => !hiddenRows.includes(row)).map(row => {
                const rowSpots = columns
                  .map(col => `${row}${col}`)
                  .filter(spaceName => {
                    if (spotFilter === 'available') return !isOccupied(spaceName)
                    if (spotFilter === 'occupied') return isOccupied(spaceName)
                    return true
                  })

                if (rowSpots.length === 0) return null

                return (
                  <div key={row}>
                    <div className="row-label">
                      <span>Fileira {row.toUpperCase()}</span>
                      <button className="row-toggle" onClick={() => toggleRowVisibility(row)} title="Ocultar fileira">
                        <EyeOff size={11} /> Ocultar
                      </button>
                    </div>
                    <div className="spot-grid">
                      {rowSpots.map(spaceName => {
                        const mine = isMySpot(spaceName)
                        const occupied = isOccupied(spaceName)
                        const cls = mine ? 'spot-mine' : occupied ? 'spot-occupied' : 'spot-available'
                        return (
                          <button
                            key={spaceName}
                            onClick={() => openModal(spaceName)}
                            className={`spot-btn ${cls}`}
                            title={mine ? 'Sua vaga' : occupied ? 'Ocupada' : 'Disponível'}
                          >
                            <Car size={12} color="#fff" style={{ opacity: 0.75 }} />
                            <span className="spot-label">{spaceName}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Empty state when filter has no matches (only among visible rows) */}
              {rows.filter(row => !hiddenRows.includes(row)).every(row =>
                columns
                  .map(col => `${row}${col}`)
                  .filter(spaceName => {
                    if (spotFilter === 'available') return !isOccupied(spaceName)
                    if (spotFilter === 'occupied') return isOccupied(spaceName)
                    return true
                  }).length === 0
              ) && (
                <div className="empty-filter">
                  {hiddenRows.length === rows.length
                    ? 'Todas as fileiras estão ocultas.'
                    : spotFilter === 'available' ? 'Nenhuma vaga disponível no momento.' : 'Nenhuma vaga ocupada no momento.'}
                </div>
              )}

              {/* Hidden rows — click to show again */}
              {hiddenRows.length > 0 && (
                <div className="hidden-rows-bar">
                  {hiddenRows.map(row => (
                    <button key={row} className="hidden-row-chip" onClick={() => toggleRowVisibility(row)}>
                      <Eye size={13} /> Mostrar Fileira {row.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── Modal ── */}
        {selectedSpace && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>

              {/* Processing state */}
              {modalStep === 'processing' ? (
                <div className="processing-wrap">
                  <div className="processing-spinner" />
                  <div className="processing-title">Redirecionando para o pagamento...</div>
                  <div className="processing-sub">Você será levado ao ambiente seguro do Stripe.</div>
                </div>
              ) : (
                <>
                  {/* Header row */}
                  <div className="modal-top">
                    <span className={`modal-badge ${selectedIsMySpot ? 'badge-mine' : selectedIsOccupied ? 'badge-occupied' : 'badge-available'}`}>
                      {selectedIsMySpot ? 'Sua vaga' : selectedIsOccupied ? 'Ocupada' : 'Disponível'}
                    </span>
                    <button className="modal-close" onClick={closeModal}><X size={14} /></button>
                  </div>

                  <h2 className="modal-title">Vaga {selectedSpace.toUpperCase()}</h2>
                  <p className="modal-sub">{getOccupiedMessage()}</p>

                  {/* ── Occupied (not mine) ── */}
                  {selectedIsOccupied && !selectedIsMySpot && (
                    <button onClick={closeModal} className="modal-btn btn-ghost">Fechar</button>
                  )}

                  {/* ── My spot: free it ── */}
                  {selectedIsMySpot && (
                    <>
                      <button onClick={handleRemove} disabled={loading} className="modal-btn btn-danger">
                        {loading ? 'Liberando...' : 'Liberar minha vaga'}
                      </button>
                      <button onClick={closeModal} className="modal-btn btn-ghost">Cancelar</button>
                    </>
                  )}

                  {/* ── Available spot: info step ── */}
                  {!selectedIsOccupied && modalStep === 'info' && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Seu nome</label>
                        <input
                          className="modal-input"
                          placeholder="João Silva"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          autoComplete="name"
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Placa do veículo</label>
                        <input
                          className="modal-input"
                          placeholder="ABC1D23"
                          maxLength={7}
                          value={plate}
                          onChange={e => setPlate(e.target.value.toUpperCase())}
                        />
                      </div>
                      <button
                        className="modal-btn btn-primary"
                        onClick={() => {
                          if (!name.trim() || !plate.trim()) {
                            showToast('Preencha nome e placa antes de continuar.', 'error')
                            return
                          }
                          setModalStep('payment')
                        }}
                      >
                        Continuar para pagamento
                      </button>
                      <button onClick={closeModal} className="modal-btn btn-ghost">Cancelar</button>
                    </>
                  )}

                  {/* ── Payment step ── */}
                  {!selectedIsOccupied && modalStep === 'payment' && (
                    <>
                      <p className="pay-section-label">Forma de pagamento</p>
                      <div className="pay-methods">

                        {/* Card */}
                        <button
                          className={`pay-method-btn ${paymentMethod === 'card' ? 'selected-card' : ''}`}
                          onClick={() => setPaymentMethod('card')}
                        >
                          <CreditCard size={20} color={paymentMethod === 'card' ? '#3b82f6' : colors.muted} />
                          <span className="pay-method-name">Cartão</span>
                          <span className="pay-method-desc">Crédito ou débito</span>
                          <span className="pay-method-badge badge-instant">Imediato</span>
                        </button>

                        {/* Pix */}
                        <button
                          className={`pay-method-btn ${paymentMethod === 'pix' ? 'selected-pix' : ''}`}
                          onClick={() => setPaymentMethod('pix')}
                        >
                          <QrCode size={20} color={paymentMethod === 'pix' ? '#009879' : colors.muted} />
                          <span className="pay-method-name">Pix</span>
                          <span className="pay-method-desc">QR Code</span>
                          <span className="pay-method-badge badge-pix">30 min</span>
                        </button>

                        {/* Boleto */}
                        <button
                          className={`pay-method-btn ${paymentMethod === 'boleto' ? 'selected-boleto' : ''}`}
                          onClick={() => setPaymentMethod('boleto')}
                        >
                          <FileText size={20} color={paymentMethod === 'boleto' ? '#d97706' : colors.muted} />
                          <span className="pay-method-name">Boleto</span>
                          <span className="pay-method-desc">Bancário</span>
                          <span className="pay-method-badge badge-boleto">3 dias</span>
                        </button>
                      </div>

                      {/* CPF — required for boleto */}
                      {paymentMethod === 'boleto' && (
                        <>
                          <p className="cpf-info">
                            ⚠️ Boleto requer CPF. A vaga só será confirmada após o pagamento no banco (até 3 dias úteis).
                          </p>
                          <div className="input-group">
                            <label className="input-label">CPF do titular</label>
                            <input
                              className="modal-input"
                              placeholder="000.000.000-00"
                              value={cpf}
                              onChange={e => setCpf(formatCpf(e.target.value))}
                              inputMode="numeric"
                              maxLength={14}
                            />
                          </div>
                        </>
                      )}

                      <div className="price-summary">
                        <span className="price-label">Reserva — Vaga {selectedSpace.toUpperCase()}</span>
                        <span className="price-value">R$ 10,00</span>
                      </div>

                      <button
                        className={`modal-btn ${paymentMethod === 'boleto' ? 'btn-amber' : 'btn-success'}`}
                        onClick={handleCheckout}
                        disabled={loading}
                      >
                        {paymentMethod === 'card'   && <><CreditCard size={16} /> Pagar com Cartão</>}
                        {paymentMethod === 'pix'    && <><QrCode size={16} /> Gerar QR Code Pix</>}
                        {paymentMethod === 'boleto' && <><FileText size={16} /> Emitir Boleto</>}
                      </button>

                      <button
                        className="modal-btn btn-ghost"
                        onClick={() => setModalStep('info')}
                        disabled={loading}
                      >
                        Voltar
                      </button>

                      <div className="secure-row">
                        <span className="secure-text">🔒 Pagamento seguro via Stripe</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </>
  )
}
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ParkingInner />
    </Suspense>
  )
}