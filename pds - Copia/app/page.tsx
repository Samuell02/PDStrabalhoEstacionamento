import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <main className="w-full max-w-md text-center space-y-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-zinc-50">
          Estacionamento
        </h1>
        <p className="text-gray-600 dark:text-zinc-400">
          Entre ou crie uma conta para continuar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 transition"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="inline-flex justify-center rounded-lg border border-gray-300 dark:border-zinc-600 px-6 py-3 font-medium text-gray-800 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-900 transition"
          >
            Criar conta
          </Link>
        </div>
      </main>
    </div>
  )
}
