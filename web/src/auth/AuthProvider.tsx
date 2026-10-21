import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './contexto'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Sessão salva (ou recém-criada ao voltar do Google)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    // Avisa quando entra, sai ou o token é renovado
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSession(nova)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const entrar = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const sair = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}
