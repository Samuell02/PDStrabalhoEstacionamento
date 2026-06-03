'use client'

import React from 'react'
import { Moon, Sun, LogOut, CreditCard, QrCode, FileText, Car, X, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import {
  createCheckoutSession,
  getParkings,
  removeParking,
  verifyAndFinalizeSession,
} from '@/app/actions/parking'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────
type ParkingSpot = { name: string; plate: string }
type PaymentMethod = 'card' | 'pix' | 'boleto'
type ToastType = 'success' | 'error' | 'pending'
type ModalStep = 'info' | 'payment' | 'processing'

// ─── Stripe session result types ─────────────────────────────────────────────
type VerifySessionSuccess = {
  space: string
  name: string
  plate: string
  alreadySaved?: boolean
}

type VerifySessionPending = {
  space: string
  name: string
  plate: string
  isPending: true
}

type VerifySessionError = {
  error: string
}

type VerifySessionResult =
  | VerifySessionSuccess
  | VerifySessionPending
  | VerifySessionError

type CheckoutSessionResult =
  | { url: string }
  | { error: string }

// ─── CPF formatter ────────────────────────────────────────────────────────────
function formatCpf(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// ─── Toast component ─────────────────────────────────────────────────────────
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

  const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#d97706'
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

// ─── Page component ──────────────────────────────────────────────────────────
export default function Page() {
  const rows = ['a', 'b']
  const columns = Array.from({ length: 14 }, (_, i) => i + 1)
  const router = useRouter()
  const searchParams = useSearchParams()

  // ─── State ────────────────────────────────────────────────────────────────
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
  const [cpf, setCpf] = React.useState('')

  const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type })

  // ── Restore localStorage ──────────────────────────────────────────────────
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('nightMode')
      if (saved) setNightMode(JSON.parse(saved))
    } catch {}
    const savedSpace = localStorage.getItem('mySpace')
    if (savedSpace) setMySpace(savedSpace)
    const savedName = localStorage.getItem('myName')
    if (savedName) setMyName(savedName)
    const savedPlate = localStorage.getItem('myPlate')
    if (savedPlate) setMyPlate(savedPlate)
  }, [])

  React.useEffect(() => {
    localStorage.setItem('nightMode', JSON.stringify(nightMode))
  }, [nightMode])

  // ── Load parkings ────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function loadSpaces() {
      const res = await getParkings()
      if (res?.isAdmin) setIsAdmin(true)
      if (res?.data) {
        const mapped: Record<string, ParkingSpot> = {}
        for (const row of res.data as { space: string; name?: string; plate?: string }[]) {
          mapped[row.space] = { name: row.name ?? '', plate: row.plate ?? '' }
        }
        setParkedSpaces(mapped)
      }
      setInitialLoading(false)
    }
    loadSpaces()
  }, [])

  // ── Handle Stripe return ────────────────────────────────────────────────
  React.useEffect(() => {
    const status = searchParams.get('status')
    const sessionId = searchParams.get('session_id')
    const space = searchParams.get('space')
    if (!status) return
    router.replace('/Parking', { scroll: false })

    if (status === 'cancelled') {
      showToast('Pagamento cancelado. Nenhuma cobrança foi realizada.', 'error')
      return
    }

    if (status === 'success' && sessionId && space) {
      ;(async () => {
        const res = (await verifyAndFinalizeSession(sessionId)) as VerifySessionResult
        if ('error' in res) {
          showToast('Erro ao salvar a vaga. Contate o suporte.', 'error')
          return
        }

        const s = res.space
        const n = res.name
        const p = res.plate
        const isPending = 'isPending' in res && res.isPending

        setParkedSpaces((prev) => ({ ...prev, [s]: { name: n, plate: p } }))
        setMySpace(s)
        setMyName(n)
        setMyPlate(p)
        localStorage.setItem('mySpace', s)
        localStorage.setItem('myName', n)
        localStorage.setItem('myPlate', p)

        showToast(
          isPending
            ? `Boleto emitido! Pague em até 3 dias úteis para confirmar a vaga ${s.toUpperCase()}.`
            : `Vaga ${s.toUpperCase()} reservada com sucesso!`,
          isPending ? 'pending' : 'success'
        )
      })()
    }
  }, [searchParams, router])

  // ── Checkout ───────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!selectedSpace || !name.trim() || !plate.trim()) {
      showToast('Preencha nome e placa antes de continuar.', 'error')
      return
    }
    if (paymentMethod === 'boleto' && cpf.replace(/\D/g, '').length !== 11) {
      showToast('Informe um CPF válido para boleto.', 'error')
      return
    }

    setLoading(true)
    setModalStep('processing')

    const res = (await createCheckoutSession(
      selectedSpace,
      name.trim(),
      plate.trim().toUpperCase(),
      paymentMethod,
      paymentMethod === 'boleto' ? cpf : undefined
    )) as CheckoutSessionResult
    setLoading(false)

    if ('error' in res) {
      showToast('Erro ao iniciar pagamento: ' + res.error, 'error')
      setModalStep('payment')
      return
    }
    if ('url' in res) window.location.href = res.url
  }

  // ── Remove spot ─────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!selectedSpace) return
    setLoading(true)
    const res = await removeParking(selectedSpace)
    setLoading(false)

    if (res && 'error' in res) {
      showToast('Erro ao liberar: ' + res.error, 'error')
      return
    }
    setParkedSpaces((prev) => {
      const n = { ...prev }
      delete n[selectedSpace]
      return n
    })
    setMySpace('')
    setMyName('')
    setMyPlate('')
    localStorage.removeItem('mySpace')
    localStorage.removeItem('myName')
    localStorage.removeItem('myPlate')
    showToast('Vaga liberada com sucesso!', 'success')
    setSelectedSpace(null)
  }

  // ── Derived helpers ─────────────────────────────────────────────────────
  const isOccupied = (space: string) => !!parkedSpaces[space]
  const isMySpot = (space: string) => mySpace === space && !!mySpace
  const selectedIsOccupied = selectedSpace ? isOccupied(selectedSpace) : false
  const selectedIsMySpot = selectedSpace ? isMySpot(selectedSpace) : false
  const totalSpots = rows.length * columns.length
  const occupiedCount = Object.keys(parkedSpaces).length
  const availableCount = totalSpots - occupiedCount
  const n = nightMode
  const getOccupiedMessage = () => {
    if (selectedIsMySpot) return `Sua vaga — ${myName} (${myPlate})`
    if (isAdmin && selectedSpace) return `Ocupada por ${parkedSpaces[selectedSpace]?.name} (${parkedSpaces[selectedSpace]?.plate})`
    return 'Esta vaga está ocupada.'
  }

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="park-root">
      {/* ... all your JSX unchanged ... */}
      {/* Add your modal, grid, toast components here as before */}
    </div>
  )
}