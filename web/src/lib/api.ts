import { supabase } from './supabase'
import { comprimirFoto } from './comprimir'
import type { Api, Convite, Lista, Membro, Tarefa } from './tipos'

// Uma consulta só traz a tarefa, quem criou, quem concluiu e as fotos
const SELECT_TAREFA = `
  *,
  criador:profiles!criada_por(nome, avatar_url),
  concluidor:profiles!concluida_por(nome, avatar_url),
  task_photos(id, caminho)
`

// Toda conversa do app com o Supabase passa por este arquivo.
// Os componentes só chamam api.algumaCoisa() e não conhecem tabelas nem SQL.
export const api: Api = {
  // ---------- Listas ----------
  async listarListas() {
    const { data, error } = await supabase.from('listas').select('id, nome').order('criada_em')
    if (error) throw error
    return data as Lista[]
  },

  async criarLista(nome) {
    const { data, error } = await supabase.rpc('criar_lista', { p_nome: nome })
    if (error) throw error
    return data as string
  },

  async membrosDaLista(listaId) {
    const { data, error } = await supabase
      .from('lista_membros')
      .select('user_id, papel, perfil:profiles!user_id(nome, avatar_url)')
      .eq('lista_id', listaId)
    if (error) throw error
    return data as unknown as Membro[]
  },

  // ---------- Tarefas ----------
  async listarTarefas(listaId) {
    const { data, error } = await supabase
      .from('tasks')
      .select(SELECT_TAREFA)
      .eq('lista_id', listaId)
      .order('criada_em', { ascending: false })
    if (error) throw error
    return data as unknown as Tarefa[]
  },

  async criarTarefa(listaId, titulo, descricao) {
    const { error } = await supabase
      .from('tasks')
      .insert({ lista_id: listaId, titulo, descricao: descricao || null })
    if (error) throw error
  },

  // O trigger do banco preenche concluida_por e concluida_em
  async alternarConclusao(t) {
    const { error } = await supabase.from('tasks').update({ concluida: !t.concluida }).eq('id', t.id)
    if (error) throw error
  },

  async salvarTarefa(id, campos) {
    const { error } = await supabase.from('tasks').update(campos).eq('id', id)
    if (error) throw error
  },

  async excluirTarefa(t) {
    const caminhos = t.task_photos.map((f) => f.caminho)
    if (caminhos.length) await supabase.storage.from('fotos').remove(caminhos)
    const { error } = await supabase.from('tasks').delete().eq('id', t.id)
    if (error) throw error
  },

  // ---------- Fotos ----------
  async enviarFoto(t, arquivo) {
    const comprimida = await comprimirFoto(arquivo)
    // O 1º trecho do caminho (lista_id) é o que a regra de segurança do Storage confere
    const caminho = `${t.lista_id}/${t.id}/${crypto.randomUUID()}.jpg`

    const { error: e1 } = await supabase.storage
      .from('fotos')
      .upload(caminho, comprimida, { contentType: 'image/jpeg' })
    if (e1) throw e1

    const { error: e2 } = await supabase.from('task_photos').insert({ task_id: t.id, caminho })
    if (e2) {
      await supabase.storage.from('fotos').remove([caminho]) // desfaz o upload
      throw e2
    }
  },

  async excluirFoto(foto) {
    await supabase.storage.from('fotos').remove([foto.caminho])
    const { error } = await supabase.from('task_photos').delete().eq('id', foto.id)
    if (error) throw error
  },

  async urlsDasFotos(caminhos) {
    if (caminhos.length === 0) return {}
    const { data, error } = await supabase.storage.from('fotos').createSignedUrls(caminhos, 3600)
    if (error) throw error
    const urls: Record<string, string> = {}
    for (const d of data) {
      if (d.path && d.signedUrl) urls[d.path] = d.signedUrl
    }
    return urls
  },

  // ---------- Convites ----------
  async convidar(listaId, email) {
    const { error } = await supabase
      .from('convites')
      .insert({ lista_id: listaId, email_convidado: email.trim().toLowerCase() })
    if (error) throw error
  },

  async convitesRecebidos(userId) {
    const { data, error } = await supabase
      .from('convites')
      .select('id, convidante:profiles!convidado_por(nome, avatar_url)')
      .eq('status', 'pendente')
      .neq('convidado_por', userId)
    if (error) throw error
    return data as unknown as Convite[]
  },

  async aceitarConvite(id) {
    const { error } = await supabase.rpc('aceitar_convite', { p_convite: id })
    if (error) throw error
  },

  async recusarConvite(id) {
    const { error } = await supabase.rpc('recusar_convite', { p_convite: id })
    if (error) throw error
  },
}
