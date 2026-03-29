'use client'

import { login } from '@/app/actions/auth'
import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  const router = useRouter()

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
    }
  }, [state, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        action={action}
        className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 space-y-6"
      >
        <h2 className="text-2xl font-semibold text-gray-800 text-center">
          Entrar na conta
        </h2>

        {/* Email */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {state?.errors?.email && (
            <p className="text-sm text-red-500">{state.errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </label>

            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
            >
              Esqueceu?
            </button>
          </div>

          <input
            id="password"
            name="password"
            type="password"
            className="border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          {state?.errors?.password && (
            <p className="text-sm text-red-500">
              {state.errors.password}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          disabled={pending}
          type="submit"
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Entrando...' : 'Entrar'}
        </button>

        {/* Global error */}
        {state?.errors?.submit && (
          <p className="text-sm text-red-500 text-center">
            {state.errors.submit}
          </p>
        )}

        {/* Footer */}
        <p className="text-sm text-gray-500 text-center">
          Não tem uma conta?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  )
}