-- Playbook Sharing Tables and Policies
-- This migration adds support for sharing playbooks with other users

-- ============================================
-- Table: playbook_shares
-- Manages active sharing relationships
-- ============================================
create table if not exists public.playbook_shares (
  id uuid default gen_random_uuid() primary key,
  playbook_id uuid references public.playbooks(id) on delete cascade not null,
  shared_with_user_id uuid references public.profiles(id) on delete cascade not null,
  permission text not null check (permission in ('view', 'edit')),
  shared_by_user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate shares
  unique(playbook_id, shared_with_user_id)
);

-- Index for faster lookups
create index if not exists idx_playbook_shares_user on public.playbook_shares(shared_with_user_id);
create index if not exists idx_playbook_shares_playbook on public.playbook_shares(playbook_id);

-- ============================================
-- Table: playbook_invitations
-- Manages pending invitations to non-users
-- ============================================
create table if not exists public.playbook_invitations (
  id uuid default gen_random_uuid() primary key,
  playbook_id uuid references public.playbooks(id) on delete cascade not null,
  email text not null,
  permission text not null check (permission in ('view', 'edit')),
  invited_by_user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  accepted_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '30 days') not null,
  
  -- Prevent duplicate invitations
  unique(playbook_id, email)
);

-- Index for faster lookups
create index if not exists idx_playbook_invitations_email on public.playbook_invitations(email);
create index if not exists idx_playbook_invitations_playbook on public.playbook_invitations(playbook_id);

-- ============================================
-- Row Level Security Policies
-- ============================================

alter table public.playbook_shares enable row level security;
alter table public.playbook_invitations enable row level security;

-- playbook_shares policies

-- Users can view shares where they are the recipient or the playbook owner
create policy "Users can view their shares"
  on public.playbook_shares for select
  using (
    auth.uid() = shared_with_user_id 
    or auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

-- Only playbook owners can create shares
create policy "Playbook owners can create shares"
  on public.playbook_shares for insert
  with check (
    auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

-- Only playbook owners can update shares
create policy "Playbook owners can update shares"
  on public.playbook_shares for update
  using (
    auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

-- Only playbook owners can delete shares
create policy "Playbook owners can delete shares"
  on public.playbook_shares for delete
  using (
    auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

-- playbook_invitations policies

-- Users can view invitations for playbooks they own
create policy "Playbook owners can view invitations"
  on public.playbook_invitations for select
  using (
    auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

-- Only playbook owners can create invitations
create policy "Playbook owners can create invitations"
  on public.playbook_invitations for insert
  with check (
    auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

-- Only playbook owners can update/delete invitations
create policy "Playbook owners can update invitations"
  on public.playbook_invitations for update
  using (
    auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

create policy "Playbook owners can delete invitations"
  on public.playbook_invitations for delete
  using (
    auth.uid() in (
      select owner_id from public.playbooks where id = playbook_id
    )
  );

-- ============================================
-- Helper Function: Accept Invitation
-- Automatically converts pending invitations to shares when user signs up
-- ============================================

create or replace function public.accept_pending_invitations()
returns trigger as $$
begin
  -- Convert any pending invitations for this email to active shares
  insert into public.playbook_shares (
    playbook_id,
    shared_with_user_id,
    permission,
    shared_by_user_id,
    created_at,
    updated_at
  )
  select 
    inv.playbook_id,
    new.id, -- The new user's ID
    inv.permission,
    inv.invited_by_user_id,
    now(),
    now()
  from public.playbook_invitations inv
  where inv.email = new.email 
    and inv.status = 'pending'
    and inv.expires_at > now()
  on conflict (playbook_id, shared_with_user_id) do nothing;

  -- Mark invitations as accepted
  update public.playbook_invitations
  set 
    status = 'accepted',
    accepted_by_user_id = new.id
  where email = new.email 
    and status = 'pending';

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-accept invitations when a user signs up
drop trigger if exists on_profile_created_accept_invitations on public.profiles;
create trigger on_profile_created_accept_invitations
  after insert on public.profiles
  for each row execute procedure public.accept_pending_invitations();

-- ============================================
-- Update playbooks table RLS policies
-- Allow users to view playbooks shared with them
-- ============================================

-- Note: This assumes you have existing RLS policies on playbooks table
-- We're adding a new policy to allow viewing shared playbooks

create policy "Users can view shared playbooks"
  on public.playbooks for select
  using (
    auth.uid() in (
      select shared_with_user_id from public.playbook_shares 
      where playbook_id = id
    )
  );

-- ============================================
-- Update plays table RLS policies  
-- Allow users to view/edit plays in shared playbooks
-- ============================================

create policy "Users can view plays in shared playbooks"
  on public.plays for select
  using (
    playbook_id in (
      select playbook_id from public.playbook_shares 
      where shared_with_user_id = auth.uid()
    )
  );

create policy "Users can edit plays in shared playbooks with edit permission"
  on public.plays for update
  using (
    playbook_id in (
      select playbook_id from public.playbook_shares 
      where shared_with_user_id = auth.uid() 
        and permission = 'edit'
    )
  );

create policy "Users can insert plays in shared playbooks with edit permission"
  on public.plays for insert
  with check (
    playbook_id in (
      select playbook_id from public.playbook_shares 
      where shared_with_user_id = auth.uid() 
        and permission = 'edit'
    )
  );

create policy "Users can delete plays in shared playbooks with edit permission"
  on public.plays for delete
  using (
    playbook_id in (
      select playbook_id from public.playbook_shares 
      where shared_with_user_id = auth.uid() 
        and permission = 'edit'
    )
  );
