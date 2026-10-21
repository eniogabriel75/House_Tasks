import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexto'

export default function RotaProtegida() {
  const { user, carregando } = useAuth()
  if (carregando) return <p className="p-6">Carregando…</p>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
