import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/contexto'
import { api } from '../lib/api'
import { mensagemErro } from '../lib/erro'
import { supabase } from '../lib/supabase'
import type { Convite, Lista, Tarefa } from '../lib/tipos'
import NovaTarefa from '../components/NovaTarefa'
import TarefaItem from '../components/TarefaItem'
import { ConvitesRecebidos, PainelLista } from '../components/Convites'

export default function Home() {
  const { user, sair } = useAuth()
  const userId = user!.id

  const [listas, setListas] = useState<Lista[]>([])
  const [listaId, setListaId] = useState<string | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [erro, setErro] = useState('')

  const carregarListas = useCallback(async () => {
    try {
      const l = await api.listarListas()
      setListas(l)
      setListaId((atual) => (atual && l.some((x) => x.id === atual) ? atual : (l[0]?.id ?? null)))
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }, [])

  const carregarConvites = useCallback(async () => {
    try {
      setConvites(await api.convitesRecebidos(userId))
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }, [userId])

  const carregarTarefas = useCallback(async () => {
    if (!listaId) return
    try {
      setTarefas(await api.listarTarefas(listaId))
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }, [listaId])

  useEffect(() => {
    carregarListas()
    carregarConvites()
  }, [carregarListas, carregarConvites])

  useEffect(() => {
    carregarTarefas()
  }, [carregarTarefas])

  // Tempo real: o Supabase avisa "algo mudou" e o app recarrega a lista.
  // O aviso vem direto do Supabase e respeita as regras RLS (só chega o que você pode ver).
  useEffect(() => {
    if (!listaId) return
    const canal = supabase
      .channel(`lista-${listaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `lista_id=eq.${listaId}` },
        carregarTarefas
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_photos' }, carregarTarefas)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [listaId, carregarTarefas])

  async function novaLista() {
    const nome = prompt('Nome da nova lista')?.trim()
    if (!nome) return
    try {
      const id = await api.criarLista(nome)
      await carregarListas()
      setListaId(id)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function onCriar(titulo: string, descricao: string) {
    if (!listaId) return
    try {
      await api.criarTarefa(listaId, titulo, descricao)
      await carregarTarefas()
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  // Pendentes primeiro, concluídas no fim
  const ordenadas = [...tarefas].sort((a, b) => Number(a.concluida) - Number(b.concluida))

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarefas</h1>
        <button onClick={sair} className="rounded-lg border px-3 py-1 text-sm">
          Sair
        </button>
      </header>

      {erro && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{erro}</p>}

      <ConvitesRecebidos
        convites={convites}
        onMudou={() => {
          carregarConvites()
          carregarListas()
        }}
      />

      <div className="flex gap-2">
        <select
          value={listaId ?? ''}
          onChange={(e) => setListaId(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-base"
          aria-label="Lista"
        >
          {listas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </select>
        <button onClick={novaLista} className="rounded-lg border px-3">
          Nova lista
        </button>
      </div>

      {listaId && <PainelLista listaId={listaId} />}
      {listaId && <NovaTarefa onCriar={onCriar} />}

      <ul className="flex flex-col gap-2">
        {ordenadas.map((t) => (
          <TarefaItem key={t.id} tarefa={t} onMudou={carregarTarefas} />
        ))}
      </ul>
      {listaId && ordenadas.length === 0 && (
        <p className="text-center text-slate-500">Nenhuma tarefa nesta lista. Adicione a primeira acima.</p>
      )}
    </main>
  )
}
