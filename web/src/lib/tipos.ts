export type Perfil = { nome: string | null; avatar_url: string | null }
export type Lista = { id: string; nome: string }
export type Foto = { id: string; caminho: string }
export type Membro = { user_id: string; papel: string; perfil: Perfil | null }
export type Convite = { id: string; convidante: Perfil | null }

export type Tarefa = {
  id: string
  lista_id: string
  titulo: string
  descricao: string | null
  concluida: boolean
  concluida_em: string | null
  observacao: string | null
  criada_em: string
  criador: Perfil | null
  concluidor: Perfil | null
  task_photos: Foto[]
}

export type CamposTarefa = {
  titulo?: string
  descricao?: string | null
  observacao?: string | null
}

// Contrato da camada de dados: lista tudo o que o app pode pedir ao Supabase.
// O TypeScript garante que api.ts implementa exatamente isto.
export interface Api {
  listarListas(): Promise<Lista[]>
  criarLista(nome: string): Promise<string>
  membrosDaLista(listaId: string): Promise<Membro[]>

  listarTarefas(listaId: string): Promise<Tarefa[]>
  criarTarefa(listaId: string, titulo: string, descricao: string): Promise<void>
  alternarConclusao(t: Tarefa): Promise<void>
  salvarTarefa(id: string, campos: CamposTarefa): Promise<void>
  excluirTarefa(t: Tarefa): Promise<void>

  enviarFoto(t: Tarefa, arquivo: File): Promise<void>
  excluirFoto(f: Foto): Promise<void>
  urlsDasFotos(caminhos: string[]): Promise<Record<string, string>>

  convidar(listaId: string, email: string): Promise<void>
  convitesRecebidos(userId: string): Promise<Convite[]>
  aceitarConvite(id: string): Promise<void>
  recusarConvite(id: string): Promise<void>
}
