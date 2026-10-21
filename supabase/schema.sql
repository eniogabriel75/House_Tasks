-- =====================================================================
-- Tarefas PWA — esquema completo do banco (rode UMA vez no SQL Editor)
-- Supabase → SQL Editor → New query → cole tudo → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) LIMPEZA (opcional). Descomente SOMENTE se já rodou scripts antigos.
--    ATENÇÃO: apaga os dados dessas tabelas.
-- ---------------------------------------------------------------------
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop table if exists task_photos, tasks, convites, lista_membros, listas, profiles, allowed_emails cascade;
-- drop function if exists handle_new_user(), is_member(uuid), is_allowed(),
--   criar_lista(text), aceitar_convite(uuid), recusar_convite(uuid), trg_tasks_conclusao();
-- drop policy if exists "fotos_acesso" on storage.objects;

-- ---------------------------------------------------------------------
-- 1) TABELAS
-- ---------------------------------------------------------------------

-- Cópia dos dados do login Google (nome, e-mail, foto). Preenchida por trigger.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  avatar_url text,
  criado_em timestamptz not null default now()
);

-- Uma lista agrupa tarefas; quem é membro da lista vê as tarefas dela
create table listas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criada_por uuid not null default auth.uid() references profiles(id),
  criada_em timestamptz not null default now()
);

create table lista_membros (
  lista_id uuid not null references listas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  papel text not null default 'membro' check (papel in ('dono', 'membro')),
  entrou_em timestamptz not null default now(),
  primary key (lista_id, user_id)
);

-- Convite por e-mail Google: fica "pendente" até a pessoa aceitar
create table convites (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references listas(id) on delete cascade,
  convidado_por uuid not null default auth.uid() references profiles(id),
  email_convidado text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aceito', 'recusado')),
  criado_em timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references listas(id) on delete cascade,
  titulo text not null,
  descricao text,
  concluida boolean not null default false,
  concluida_por uuid references profiles(id),
  concluida_em timestamptz,
  observacao text,
  criada_por uuid not null default auth.uid() references profiles(id),
  criada_em timestamptz not null default now()
);

-- Fotos de comprovação (uma tarefa pode ter várias). Guarda o CAMINHO no Storage.
create table task_photos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  caminho text not null,
  enviada_por uuid not null default auth.uid() references profiles(id),
  criada_em timestamptz not null default now()
);

create index on tasks (lista_id);
create index on task_photos (task_id);
create index on lista_membros (user_id);
create index on convites (lower(email_convidado));

-- ---------------------------------------------------------------------
-- 2) FUNÇÕES E TRIGGERS
-- ---------------------------------------------------------------------

-- O usuário logado é membro desta lista? (base de todas as regras de acesso)
create function is_member(p_lista uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from lista_membros
    where lista_id = p_lista and user_id = auth.uid()
  );
$$;

-- Primeiro login com Google: cria o perfil e a lista pessoal "Minhas tarefas"
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nova_lista uuid;
begin
  insert into profiles (id, nome, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into listas (nome, criada_por)
  values ('Minhas tarefas', new.id) returning id into nova_lista;
  insert into lista_membros (lista_id, user_id, papel)
  values (nova_lista, new.id, 'dono');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Quem concluiu e quando é decidido PELO BANCO (auth.uid() e now()),
-- assim o app não consegue "assinar" a conclusão como outra pessoa.
create function trg_tasks_conclusao() returns trigger
language plpgsql as $$
begin
  if not new.concluida then
    new.concluida_por := null;
    new.concluida_em := null;
  elsif tg_op = 'INSERT' then
    new.concluida_por := auth.uid();
    new.concluida_em := now();
  elsif not old.concluida then
    new.concluida_por := auth.uid();
    new.concluida_em := now();
  else
    new.concluida_por := old.concluida_por;
    new.concluida_em := old.concluida_em;
  end if;
  return new;
end;
$$;

create trigger tasks_conclusao
before insert or update on tasks
for each row execute function trg_tasks_conclusao();

-- Criar lista nova (só por aqui: assim ninguém se adiciona sozinho a uma lista alheia)
create function criar_lista(p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  insert into listas (nome, criada_por) values (p_nome, auth.uid()) returning id into v;
  insert into lista_membros (lista_id, user_id, papel) values (v, auth.uid(), 'dono');
  return v;
end;
$$;

-- Aceitar convite: confere se o convite é para o e-mail do token Google de quem chama
create function aceitar_convite(p_convite uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c convites%rowtype;
begin
  select * into c from convites
  where id = p_convite and status = 'pendente'
    and lower(email_convidado) = lower(auth.jwt() ->> 'email');
  if not found then raise exception 'Convite inválido'; end if;
  insert into lista_membros (lista_id, user_id) values (c.lista_id, auth.uid())
    on conflict do nothing;
  update convites set status = 'aceito' where id = c.id;
end;
$$;

create function recusar_convite(p_convite uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update convites set status = 'recusado'
  where id = p_convite and status = 'pendente'
    and lower(email_convidado) = lower(auth.jwt() ->> 'email');
end;
$$;

-- ---------------------------------------------------------------------
-- 3) USUÁRIOS QUE JÁ EXISTEM (inofensivo em projeto novo)
-- ---------------------------------------------------------------------
insert into profiles (id, nome, email, avatar_url)
select id,
       coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
       email,
       raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

do $$
declare p record; nova uuid;
begin
  for p in
    select id from profiles
    where not exists (select 1 from lista_membros m where m.user_id = profiles.id)
  loop
    insert into listas (nome, criada_por) values ('Minhas tarefas', p.id) returning id into nova;
    insert into lista_membros (lista_id, user_id, papel) values (nova, p.id, 'dono');
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4) SEGURANÇA (RLS): quem pode ler/alterar cada linha
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table listas enable row level security;
alter table lista_membros enable row level security;
alter table convites enable row level security;
alter table tasks enable row level security;
alter table task_photos enable row level security;

-- Vejo meu perfil, o de quem divide lista comigo e o de quem me convidou
create policy "profiles_leitura" on profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1 from lista_membros a
    join lista_membros b on a.lista_id = b.lista_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
  or exists (
    select 1 from convites c
    where c.convidado_por = profiles.id
      and lower(c.email_convidado) = lower(auth.jwt() ->> 'email')
  )
);

create policy "listas_leitura" on listas for select to authenticated
  using (is_member(id));
create policy "listas_editar" on listas for update to authenticated
  using (is_member(id));

create policy "membros_leitura" on lista_membros for select to authenticated
  using (is_member(lista_id));
create policy "membros_sair" on lista_membros for delete to authenticated
  using (user_id = auth.uid());

create policy "convites_leitura" on convites for select to authenticated
  using (convidado_por = auth.uid()
         or lower(email_convidado) = lower(auth.jwt() ->> 'email'));
create policy "convites_criar" on convites for insert to authenticated
  with check (convidado_por = auth.uid() and is_member(lista_id));
create policy "convites_cancelar" on convites for delete to authenticated
  using (convidado_por = auth.uid());

create policy "tasks_acesso" on tasks for all to authenticated
  using (is_member(lista_id)) with check (is_member(lista_id));

create policy "photos_acesso" on task_photos for all to authenticated
  using (exists (select 1 from tasks t where t.id = task_id and is_member(t.lista_id)))
  with check (exists (select 1 from tasks t where t.id = task_id and is_member(t.lista_id)));

-- ---------------------------------------------------------------------
-- 5) FOTOS: bucket privado (5 MB, só imagens) e regra de acesso
--    Caminho dos arquivos: lista_id/task_id/arquivo.jpg
--    A regra lê a 1ª pasta (lista_id) e confere se o usuário é membro.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "fotos_acesso" on storage.objects for all to authenticated
  using (bucket_id = 'fotos' and is_member(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'fotos' and is_member(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------
-- 6) TEMPO REAL: o app é avisado quando tarefas/fotos mudam
--    (replica identity full faz o aviso de exclusão respeitar o filtro por lista)
-- ---------------------------------------------------------------------
alter table tasks replica identity full;
alter table task_photos replica identity full;

do $$ begin
  alter publication supabase_realtime add table tasks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table task_photos;
exception when duplicate_object then null; end $$;
