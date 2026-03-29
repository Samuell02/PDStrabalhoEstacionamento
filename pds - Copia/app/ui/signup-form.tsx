'use client'

import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import { useActionState } from 'react'

export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        action={action}
        className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 space-y-6"
      >
        <h2 className="text-2xl font-semibold text-gray-800 text-center">
          Crie uma conta
        </h2>

        {/* Name */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="name"
            name="name"
            placeholder="John Doe"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {state?.errors?.name && (
            <p className="text-sm text-red-500">{state.errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            placeholder="you@example.com"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {state?.errors?.email && (
            <p className="text-sm text-red-500">{state.errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {state?.errors?.password && (
            <div className="text-sm text-red-500 mt-1">
              <p className="font-medium">Password must:</p>
              <ul className="list-disc list-inside">
                {state.errors.password.map((error) => (
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
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating account...' : 'Sign Up'}
        </button>

        {state?.message && (
          <p className="text-sm text-red-500 text-center">{state.message}</p>
        )}

        <p className="text-sm text-gray-500 text-center">
          Ja tem uma conta?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </form>
    </div>
  )
}