'use client'

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { createParking } from '@/app/actions/parking'

export default function Page() {
  const rows = ['a', 'b']
  const columns = Array.from({ length: 14 }, (_, i) => i + 1)

  const [selectedSpace, setSelectedSpace] = React.useState<string | null>(null)
  const [nightMode, setNightMode] = React.useState(false)

  const [name, setName] = React.useState('')
  const [plate, setPlate] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const saved = localStorage.getItem('nightMode')
    if (saved !== null) {
      setNightMode(JSON.parse(saved))
    }
  }, [])

  React.useEffect(() => {
    localStorage.setItem('nightMode', JSON.stringify(nightMode))
  }, [nightMode])

  const openModal = (space: string) => {
    setSelectedSpace(space)
  }

  const closeModal = () => {
    setSelectedSpace(null)
    setName('')
    setPlate('')
  }

  const toggleNightMode = () => {
    setNightMode((prev) => !prev)
  }

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

    alert('Saved successfully!')
    closeModal()
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ backgroundColor: nightMode ? '#1a1a1a' : '#FFF5F2' }}
    >
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto">
        <div className="grid grid-cols-2 gap-2 md:gap-3 max-w-2xl w-full">
          {columns.map((col) =>
            rows.map((row) => {
              const spaceName = `${row}${col}`
              return (
                <button
                  key={spaceName}
                  onClick={() => openModal(spaceName)}
                  className={`flex items-center justify-center border-2 rounded-lg p-3 md:p-4 h-14 md:h-16 transition-colors ${
                    nightMode
                      ? 'bg-green-800 hover:bg-green-700 active:bg-green-900 border-green-600'
                      : 'bg-green-500 hover:bg-green-600 active:bg-green-700 border-gray-300'
                  }`}
                >
                  <span className="font-semibold text-white text-sm md:text-base">
                    {spaceName}
                  </span>
                </button>
              )
            })
          )}
        </div>
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
            <h2 className="text-2xl font-bold mb-4">
              Parking Space {selectedSpace}
            </h2>

            <div className="space-y-3 mb-6">
              <input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border p-2 rounded text-black"
              />

              <input
                placeholder="Car plate"
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
          </div>
        </div>
      )}

      <footer
        className={`border-t p-4 ${
          nightMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex justify-center items-center gap-4">
          <button onClick={toggleNightMode}>
            {nightMode ? <Sun /> : <Moon />}
          </button>
        </div>
      </footer>
    </div>
  )
}