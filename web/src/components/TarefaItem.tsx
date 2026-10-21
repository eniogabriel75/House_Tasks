import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { mensagemErro } from '../lib/erro'
import type { Tarefa } from '../lib/tipos'

type Props = { tarefa: Tarefa; onMudou: () => void }

const formatar = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function TarefaItem({ tarefa, onMudou }: Props) {
  const [aberta, setAberta] = useState(false)
  const [obs, setObs] = useState(tarefa.observacao ?? '')
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)

  // Links temporários das fotos: só são pedidos quando o cartão está aberto
  const caminhos = tarefa.task_photos.map((f) => f.caminho)
  const chave = caminhos.join('|')
  useEffect(() => {
    if (!aberta) return
    let ativo = true
    api
      .urlsDasFotos(chave ? chave.split('|') : [])
      .then((u) => ativo && setUrls(u))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [aberta, chave])

  // Bloqueia os botões, executa, avisa se der erro e recarrega a lista
  async function executar(acao: () => Promise<void>) {
    setOcupado(true)
    try {
      await acao()
      onMudou()
    } catch (e) {
      alert(mensagemErro(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className="rounded-2xl border p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={tarefa.concluida}
          disabled={ocupado}
          onChange={() => executar(() => api.alternarConclusao(tarefa))}
          className="mt-1 h-6 w-6 shrink-0"
          aria-label={`Marcar "${tarefa.titulo}" como feita`}
        />
        <button onClick={() => setAberta(!aberta)} className="flex-1 text-left">
          <p className={tarefa.concluida ? 'text-slate-400 line-through' : 'font-medium'}>
            {tarefa.titulo}
          </p>
          {tarefa.concluida && tarefa.concluida_em && (
            <p className="text-sm text-slate-500">
              Feito por {tarefa.concluidor?.nome ?? '—'} em {formatar(tarefa.concluida_em)}
            </p>
          )}
          {tarefa.task_photos.length > 0 && (
            <p className="text-sm text-slate-500">{tarefa.task_photos.length} foto(s)</p>
          )}
        </button>
      </div>

      {aberta && (
        <div className="mt-3 flex flex-col gap-3 border-t pt-3">
          {tarefa.descricao && <p className="text-slate-700">{tarefa.descricao}</p>}
          <p className="text-xs text-slate-500">
            Criada por {tarefa.criador?.nome ?? '—'} em {formatar(tarefa.criada_em)}
          </p>

          <label className="text-sm font-medium" htmlFor={`obs-${tarefa.id}`}>
            Observação
          </label>
          <textarea
            id={`obs-${tarefa.id}`}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            className="rounded-lg border px-3 py-2 text-base"
          />
          <button
            disabled={ocupado || obs === (tarefa.observacao ?? '')}
            onClick={() =>
              executar(() => api.salvarTarefa(tarefa.id, { observacao: obs.trim() || null }))
            }
            className="self-start rounded-lg border px-3 py-1 disabled:opacity-40"
          >
            Salvar observação
          </button>

          <div className="grid grid-cols-3 gap-2">
            {tarefa.task_photos.map((f) => (
              <div key={f.id} className="relative">
                {urls[f.caminho] ? (
                  <a href={urls[f.caminho]} target="_blank" rel="noreferrer">
                    <img
                      src={urls[f.caminho]}
                      alt="Foto da tarefa"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  </a>
                ) : (
                  <div className="aspect-square w-full rounded-lg bg-slate-100" />
                )}
                <button
                  aria-label="Excluir foto"
                  onClick={() => confirm('Excluir esta foto?') && executar(() => api.excluirFoto(f))}
                  className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Campo escondido; no iPhone abre "Tirar foto / Fototeca" */}
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              e.target.value = ''
              if (arquivo) executar(() => api.enviarFoto(tarefa, arquivo))
            }}
          />
          <div className="flex gap-2">
            <button
              disabled={ocupado}
              onClick={() => inputFoto.current?.click()}
              className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
            >
              {ocupado ? 'Aguarde…' : 'Adicionar foto'}
            </button>
            <button
              disabled={ocupado}
              onClick={() => confirm('Excluir a tarefa?') && executar(() => api.excluirTarefa(tarefa))}
              className="rounded-lg border px-3 py-2 text-red-600 disabled:opacity-40"
            >
              Excluir tarefa
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
