'use client'

import Link from 'next/link'
import { signup } from '/actions/auth'
import { useActionState, useEffect, useState } from 'react'

export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined)
  const [showPopup, setShowPopup] = useState(false)

  // 👇 Detect successful signup
  useEffect(() => {
    if (state?.success) {
      setShowPopup(true)
    }
  }, [state])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      
      {/* ✅ POPUP */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Confirme seu email 📧
            </h3>
            <p className="text-sm text-gray-600">
              Enviamos um link de confirmação para seu email.  
              Verifique sua caixa de entrada antes de fazer login.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <form
        action={action}
        className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 space-y-6"
      >
        <h2 className="text-2xl font-semibold text-gray-800 text-center">
          Crie uma conta
        </h2>

        {/* Name */}
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Nome</label>
          <input
            name="name"
            placeholder="John Doe"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
          />
          {state?.errors?.name && (
            <p className="text-sm text-red-500">{state.errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            name="email"
            placeholder="you@example.com"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
          />
          {state?.errors?.email && (
            <p className="text-sm text-red-500">{state.errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Senha</label>
          <input
            name="password"
            type="password"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
          />
          {state?.errors?.password && (
            <div className="text-sm text-red-500 mt-1">
              <ul className="list-disc list-inside">
                {state.errors.password.map((error: string) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          disabled={pending}
          type="submit"
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Creating account...' : 'Sign Up'}
        </button>

        <p className="text-sm text-gray-500 text-center">
          Ja tem uma conta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  )
}