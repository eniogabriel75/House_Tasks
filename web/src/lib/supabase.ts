import { createClient } from '@supabase/supabase-js'

// A chave "anon" pode ficar no navegador: sozinha ela não dá acesso a nada.
// Quem protege os dados são as regras RLS do banco (supabase/schema.sql).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { flowType: 'pkce' } }
)
