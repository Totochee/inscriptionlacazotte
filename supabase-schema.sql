-- LA CAZOTTE · SCHÉMA SUPABASE
-- À exécuter une fois dans Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  student_number text,
  formation text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_types (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  deadline date,
  formation text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id) on delete restrict,
  storage_path text not null,
  original_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique (user_id, document_type_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists submissions_user_id_idx on public.submissions(user_id);
create index if not exists submissions_status_idx on public.submissions(status);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_recipient_id_idx on public.messages(recipient_id);
create index if not exists document_types_active_idx on public.document_types(active);

-- Création automatique du profil après inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, student_number, formation)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'student_number', ''),
    nullif(new.raw_user_meta_data ->> 'formation', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Vérification du rôle sans exposer la table complète.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.submissions enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or role = 'admin'
  or (select public.is_admin())
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "document_types_select" on public.document_types;
create policy "document_types_select" on public.document_types for select to authenticated
using (
  (select public.is_admin())
  or (
    active = true
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and (document_types.formation is null or document_types.formation = p.formation)
    )
  )
);

drop policy if exists "document_types_admin_insert" on public.document_types;
create policy "document_types_admin_insert" on public.document_types for insert to authenticated
with check ((select public.is_admin()) and created_by = (select auth.uid()));

drop policy if exists "document_types_admin_update" on public.document_types;
create policy "document_types_admin_update" on public.document_types for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "document_types_admin_delete" on public.document_types;
create policy "document_types_admin_delete" on public.document_types for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "submissions_select" on public.submissions;
create policy "submissions_select" on public.submissions for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "submissions_student_insert" on public.submissions;
create policy "submissions_student_insert" on public.submissions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'submitted'
  and reviewed_at is null
  and reviewed_by is null
  and exists (
    select 1
    from public.document_types d
    join public.profiles p on p.id = (select auth.uid())
    where d.id = document_type_id
      and d.active = true
      and (d.formation is null or d.formation = p.formation)
  )
);

drop policy if exists "submissions_student_replace" on public.submissions;
create policy "submissions_student_replace" on public.submissions for update to authenticated
using (
  user_id = (select auth.uid())
  and status in ('submitted', 'rejected')
)
with check (
  user_id = (select auth.uid())
  and status = 'submitted'
  and reviewed_at is null
  and reviewed_by is null
);

drop policy if exists "submissions_admin_update" on public.submissions;
create policy "submissions_admin_update" on public.submissions for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "submissions_admin_delete" on public.submissions;
create policy "submissions_admin_delete" on public.submissions for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants" on public.messages for select to authenticated
using (
  sender_id = (select auth.uid())
  or recipient_id = (select auth.uid())
);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.profiles
      where id = recipient_id and role = 'admin'
    )
  )
);

-- Droits minimums accordés à l'application.
revoke all on public.profiles, public.document_types, public.submissions, public.messages from anon;
grant select on public.profiles, public.document_types, public.submissions, public.messages to authenticated;
grant insert on public.document_types, public.submissions, public.messages to authenticated;
grant update on public.document_types, public.submissions to authenticated;
grant delete on public.document_types, public.submissions to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, student_number, formation, updated_at) on public.profiles to authenticated;

-- Bucket privé pour les fichiers administratifs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'administrative-documents',
  'administrative-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_insert_own_folder" on storage.objects;
create policy "storage_insert_own_folder" on storage.objects for insert to authenticated
with check (
  bucket_id = 'administrative-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.document_types d
    join public.profiles p on p.id = (select auth.uid())
    where d.id::text = (storage.foldername(name))[2]
      and d.active = true
      and (d.formation is null or d.formation = p.formation)
  )
);

drop policy if exists "storage_select_owner_or_admin" on storage.objects;
create policy "storage_select_owner_or_admin" on storage.objects for select to authenticated
using (
  bucket_id = 'administrative-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);

drop policy if exists "storage_delete_owner_or_admin" on storage.objects;
create policy "storage_delete_owner_or_admin" on storage.objects for delete to authenticated
using (
  bucket_id = 'administrative-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);

-- Après la création de votre propre compte, remplacez l'adresse ci-dessous,
-- puis exécutez uniquement cette instruction pour activer l'espace secrétariat :
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'VOTRE-EMAIL@EXEMPLE.FR');
