import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type AuthCtx = {
  user: User | null
  carregando: boolean
  entrar: () => Promise<void>
  sair: () => Promise<void>
}

export const AuthContext = createContext<AuthCtx | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
