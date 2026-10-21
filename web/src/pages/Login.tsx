import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/contexto'

export default function Login() {
  const { user, carregando, entrar } = useAuth()

  if (carregando) return <p className="p-6">Carregando…</p>
  if (user) return <Navigate to="/" replace />

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Tarefas</h1>
      <button
        onClick={entrar}
        className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white active:scale-95"
      >
        Entrar com Google
      </button>
    </main>
  )
}
