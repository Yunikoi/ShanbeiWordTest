-- 在 Supabase SQL Editor 中运行一次（免费项目即可）
create table if not exists public.app_sync (
  sync_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_sync enable row level security;

-- 个人学习数据：知道 sync_key 即可读写（同步码即密码，请勿公开）
drop policy if exists "app_sync_anon_all" on public.app_sync;
create policy "app_sync_anon_all" on public.app_sync
  for all
  to anon, authenticated
  using (true)
  with check (true);
