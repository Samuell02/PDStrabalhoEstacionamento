'use client'

import React from 'react'
import { Moon, Sun, LogOut } from 'lucide-react'
import { createParking, getParkings, removeParking } from '@/app/actions/parking'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type ParkingSpot = {
  name: string
  plate: string
}

export default function Page() {
  const rows = ['a', 'b']
  const columns = Array.from({ length: 14 }, (_, i) => i + 1)
  const router = useRouter()

  const [selectedSpace, setSelectedSpace] = React.useState<string | null>(null)

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

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('nightMode')
      if (saved !== null) setNightMode(JSON.parse(saved))
    } catch {}
  }, [])

  React.useEffect(() => {
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

  React.useEffect(() => {
    async function loadSpaces() {
      const res = await getParkings()
      if (res?.isAdmin) setIsAdmin(true)
      if (res?.data) {
        const mapped: Record<string, ParkingSpot> = {}
        for (const row of res.data as unknown as { space: string; name?: string; plate?: string }[]) {
          mapped[row.space] = { name: row.name ?? '', plate: row.plate ?? '' }
        }
        setParkedSpaces(mapped)
      }
      setInitialLoading(false)
    }
    loadSpaces()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isOccupied = (space: string) => !!parkedSpaces[space]
  const isMySpot = (space: string) => mySpace === space && !!mySpace

  const openModal = (space: string) => setSelectedSpace(space)

  const closeModal = () => {
    setSelectedSpace(null)
    setName('')
    setPlate('')
  }

  const toggleNightMode = () => setNightMode((prev: boolean) => !prev)

  const handleSubmit = async () => {
    if (!name || !plate || !selectedSpace) {
      alert('Please fill all fields')
      return
    }

    setLoading(true)
    const res = await createParking(selectedSpace, name, plate)
    setLoading(false)

    if (res?.error) {
      alert('Error saving: ' + res.error)
      return
    }

    setParkedSpaces((prev) => ({
      ...prev,
      [selectedSpace]: { name, plate },
    }))

    setMySpace(selectedSpace)
    setMyName(name)
    setMyPlate(plate)
    localStorage.setItem('mySpace', selectedSpace)
    localStorage.setItem('myName', name)
    localStorage.setItem('myPlate', plate)

    alert('Saved successfully!')
    closeModal()
  }

  const handleRemove = async () => {
    if (!selectedSpace) return
    setLoading(true)
    const res = await removeParking(selectedSpace)
    setLoading(false)

    if (res?.error) {
      alert('Error removing: ' + res.error)
      return
    }

    setParkedSpaces((prev) => {
      const next = { ...prev }
      delete next[selectedSpace]
      return next
    })

    setMySpace('')
    setMyName('')
    setMyPlate('')
    localStorage.removeItem('mySpace')
    localStorage.removeItem('myName')
    localStorage.removeItem('myPlate')

    alert('Spot freed!')
    closeModal()
  }

  const getSpaceColor = (spaceName: string) => {
    if (isMySpot(spaceName)) {
      return 'bg-blue-500 hover:bg-blue-600 border-blue-700'
    }
    if (isOccupied(spaceName)) {
      return 'bg-red-500 hover:bg-red-600 border-red-700'
    }
    return nightMode
      ? 'bg-green-800 hover:bg-green-700 border-green-600'
      : 'bg-green-500 hover:bg-green-600 border-gray-300'
  }

  const selectedIsOccupied = selectedSpace ? isOccupied(selectedSpace) : false
  const selectedIsMySpot = selectedSpace ? isMySpot(selectedSpace) : false

  const getOccupiedMessage = () => {
    if (selectedIsMySpot) {
      return `This is your spot. ${myName} (${myPlate})`
    }
    if (isAdmin && selectedSpace) {
      return `Occupied by ${parkedSpaces[selectedSpace]?.name} (${parkedSpaces[selectedSpace]?.plate})`
    }
    return 'This spot is occupied.'
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ backgroundColor: nightMode ? '#1a1a1a' : '#FFF5F2' }}
    >
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto">
        {initialLoading ? (
          <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading parking spots...
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:gap-3 max-w-2xl w-full">
            {columns.map((col) =>
              rows.map((row) => {
                const spaceName = `${row}${col}`
                return (
                  <button
                    key={spaceName}
                    onClick={() => openModal(spaceName)}
                    className={`flex items-center justify-center border-2 rounded-lg p-3 md:p-4 h-14 md:h-16 transition-colors ${getSpaceColor(spaceName)}`}
                  >
                    <span className="font-semibold text-white text-sm md:text-base">
                      {spaceName}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {selectedSpace && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className={`rounded-lg shadow-xl p-6 max-w-md w-full ${
              nightMode ? 'bg-gray-800 text-white' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-1">Espaço de Estacionamento {selectedSpace}</h2>

            {selectedIsOccupied ? (
              <>
                <p className="text-sm mb-4 text-gray-400">{getOccupiedMessage()}</p>

                {selectedIsMySpot && (
                  <button
                    onClick={handleRemove}
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 mb-2"
                  >
                    {loading ? 'Removing...' : 'Free My Spot'}
                  </button>
                )}

                <button
                  onClick={closeModal}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="text-sm mb-4 text-gray-400">This spot is available.</p>

                <div className="space-y-3 mb-6">
                  <input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border p-2 rounded text-black"
                  />
                  <input
                    placeholder="Car plate"
                    maxLength={7}
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full border p-2 rounded text-black"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 mb-2"
                >
                  {loading ? 'Saving...' : 'Confirm Parking'}
                </button>

                <button
                  onClick={closeModal}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <footer
        className={`border-t p-4 ${
          nightMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
            <span>🟢   Disponivel</span>
            <span>🔴   Ocupado (por outros)</span>
            <span>🔵   Seu estacionamento</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleNightMode}>
              {nightMode ? <Sun /> : <Moon />}
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                nightMode
                  ? 'text-red-400 hover:bg-red-900/30'
                  : 'text-red-500 hover:bg-red-50'
              }`}
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}