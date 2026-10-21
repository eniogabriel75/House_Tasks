import { useState, type FormEvent } from 'react'

type Props = { onCriar: (titulo: string, descricao: string) => Promise<void> }

export default function NovaTarefa({ onCriar }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setEnviando(true)
    try {
      await onCriar(titulo.trim(), descricao.trim())
      setTitulo('')
      setDescricao('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 rounded-2xl border p-3">
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Nova tarefa"
        className="rounded-lg border px-3 py-2 text-base"
      />
      <input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição (opcional)"
        className="rounded-lg border px-3 py-2 text-base"
      />
      <button
        disabled={enviando || !titulo.trim()}
        className="rounded-lg bg-slate-900 py-2 font-medium text-white disabled:opacity-40"
      >
        Adicionar tarefa
      </button>
    </form>
  )
}
