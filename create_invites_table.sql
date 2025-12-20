-- Create invites table if not exists
create table if not exists public.invites (
  code text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_used boolean default false,
  used_by text references public.users(user_id),
  expires_at timestamp with time zone
);

-- Enable RLS
alter table public.invites enable row level security;

-- Remove existing policies if any (to clean up)
-- We are moving to Server Actions with Service Role for security, so we don't need public RLS policies.
drop policy if exists "Anyone can check invite codes" on public.invites;
drop policy if exists "Admins can create invites" on public.invites;
drop policy if exists "Users can mark invite as used" on public.invites;
