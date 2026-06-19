'use client'

import React from 'react'
import {
  Moon,
  Sun,
  LogOut,
  CreditCard,
  QrCode,
  FileText,
  Car,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react'
import {
  createCheckoutSession,
  getParkings,
  removeParking,
  verifyAndFinalizeSession,
} from '@/app/actions/parking'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

type ParkingSpot = { name: string; plate: string }
type PaymentMethod = 'card' | 'pix' | 'boleto'
type ToastType = 'success' | 'error' | 'pending'
type ModalStep = 'info' | 'payment' | 'processing'

// ─── CPF formatter ────────────────────────────────────────────────────────────
function formatCpf(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
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

  const bg =
    type === 'success'
      ? '#16a34a'
      : type === 'error'
      ? '#dc2626'
      : '#d97706'

  const Icon =
    type === 'success'
      ? CheckCircle
      : type === 'error'
      ? AlertCircle
      : Clock

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        gap: '0.625rem',
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        background: bg,
        color: '#fff',
      }}
    >
      <Icon size={18} />
      <span>{message}</span>
      <button onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Page() {
  const rows = ['a', 'b']
  const columns = Array.from({ length: 14 }, (_, i) => i + 1)

  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedSpace, setSelectedSpace] = React.useState<string | null>(null)
  const [modalStep, setModalStep] =
    React.useState<ModalStep>('info')
  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethod>('card')
  const [nightMode, setNightMode] = React.useState(false)
  const [name, setName] = React.useState('')
  const [plate, setPlate] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [parkedSpaces, setParkedSpaces] = React.useState<
    Record<string, ParkingSpot>
  >({})

  const [mySpace, setMySpace] = React.useState('')
  const [myName, setMyName] = React.useState('')
  const [myPlate, setMyPlate] = React.useState('')

  const [toast, setToast] = React.useState<{
    message: string
    type: ToastType
  } | null>(null)

  const showToast = (
    message: string,
    type: ToastType = 'success'
  ) => setToast({ message, type })

  // ── Load parking spots ──────────────────────────────────────────────────────
  React.useEffect(() => {
    async function load() {
      const res = await getParkings()

      if (res?.data) {
        const mapped: Record<string, ParkingSpot> = {}

        for (const row of res.data as any[]) {
          mapped[row.space] = {
            name: row.name ?? '',
            plate: row.plate ?? '',
          }
        }

        setParkedSpaces(mapped)
      }

      setInitialLoading(false)
    }

    load()
  }, [])

  // ── Stripe return ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    const status = searchParams.get('status')
    const sessionId = searchParams.get('session_id')

    if (!status) return

    router.replace('/Parking')

    if (status === 'success' && sessionId) {
      ;(async () => {
        const res = await verifyAndFinalizeSession(sessionId)

        // 🔴 FIX PRINCIPAL: não acessar res.error diretamente
        if (!res || 'error' in res) {
          showToast(
            'Erro ao confirmar pagamento.',
            'error'
          )
          return
        }

        setParkedSpaces((prev) => ({
          ...prev,
          [res.space]: {
            name: res.name,
            plate: res.plate,
          },
        }))

        setMySpace(res.space)
        setMyName(res.name)
        setMyPlate(res.plate)

        showToast(
          `Vaga ${res.space.toUpperCase()} reservada!`,
          'success'
        )
      })()
    }
  }, [])

  const isOccupied = (s: string) => !!parkedSpaces[s]
  const isMine = (s: string) => mySpace === s

  const openModal = (space: string) => {
    setSelectedSpace(space)
    setModalStep('info')
  }

  const closeModal = () => setSelectedSpace(null)

  const handleCheckout = async () => {
    if (!selectedSpace) return

    setLoading(true)
    setModalStep('processing')

    const res = await createCheckoutSession(
      selectedSpace,
      name,
      plate,
      paymentMethod
    )

    setLoading(false)

    if (!res || 'error' in res) {
      showToast('Erro no checkout', 'error')
      return
    }

    window.location.href = res.url
  }

  const colors = {
    bg: nightMode ? '#0f0f0f' : '#f5f3ef',
  }

  return (
    <>
      <style>{`
        /* 🔵 ALTERAÇÃO PEDIDA: fundo gradiente branco → azul claro */
        .park-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #e6f2ff 100%
          );
        }

        .park-main {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          position: relative;
        }

        .grid-wrapper {
          max-width: 640px;
          width: 100%;
        }

        .spot-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }

        .spot-btn {
          height: 60px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
        }

        .spot-available {
          background: #16a34a;
        }

        .spot-occupied {
          background: #dc2626;
        }

        .spot-mine {
          background: #2563eb;
        }
      `}</style>

      <div className="park-root">
        <main className="park-main">
          <div className="grid-wrapper">
            {rows.map((r) => (
              <div key={r}>
                <div>{r.toUpperCase()}</div>

                <div className="spot-grid">
                  {columns.map((c) => {
                    const space = `${r}${c}`
                    const cls = isMine(space)
                      ? 'spot-mine'
                      : isOccupied(space)
                      ? 'spot-occupied'
                      : 'spot-available'

                    return (
                      <button
                        key={space}
                        className={`spot-btn ${cls}`}
                        onClick={() => openModal(space)}
                      >
                        {space}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>

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