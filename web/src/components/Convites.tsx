import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { mensagemErro } from '../lib/erro'
import type { Convite, Membro } from '../lib/tipos'

export function ConvitesRecebidos({
  convites,
  onMudou,
}: {
  convites: Convite[]
  onMudou: () => void
}) {
  if (convites.length === 0) return null

  async function responder(id: string, aceitar: boolean) {
    try {
      if (aceitar) await api.aceitarConvite(id)
      else await api.recusarConvite(id)
    } catch (e) {
      alert(mensagemErro(e))
    }
    onMudou()
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-3">
      <h2 className="font-semibold">Convites</h2>
      {convites.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2">
          <p className="text-sm">{c.convidante?.nome ?? 'Alguém'} convidou você para uma lista</p>
          <div className="flex gap-2">
            <button
              onClick={() => responder(c.id, true)}
              className="rounded-lg bg-slate-900 px-3 py-1 text-white"
            >
              Aceitar
            </button>
            <button onClick={() => responder(c.id, false)} className="rounded-lg border px-3 py-1">
              Recusar
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

export function PainelLista({ listaId }: { listaId: string }) {
  const [membros, setMembros] = useState<Membro[]>([])
  const [email, setEmail] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let ativo = true
    api
      .membrosDaLista(listaId)
      .then((m) => ativo && setMembros(m))
      .catch(() => ativo && setMembros([]))
    return () => {
      ativo = false
    }
  }, [listaId])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      await api.convidar(listaId, email)
      setEmail('')
      setAviso('Convite enviado. A pessoa o verá ao entrar com esse e-mail Google.')
    } catch (err) {
      setAviso(mensagemErro(err))
    }
  }

  return (
    <details className="rounded-2xl border p-3">
      <summary className="cursor-pointer font-medium">Membros e convites</summary>
      <ul className="mt-3 flex flex-col gap-2">
        {membros.map((m) => (
          <li key={m.user_id} className="flex items-center gap-2">
            {m.perfil?.avatar_url && (
              <img src={m.perfil.avatar_url} alt="" className="h-7 w-7 rounded-full" />
            )}
            <span>{m.perfil?.nome ?? 'Usuário'}</span>
            <span className="text-xs text-slate-500">{m.papel}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className="mt-3 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail Google da pessoa"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-base"
        />
        <button className="rounded-lg bg-slate-900 px-3 text-white">Convidar</button>
      </form>
      {aviso && <p className="mt-2 text-sm text-slate-600">{aviso}</p>}
    </details>
  )
}
