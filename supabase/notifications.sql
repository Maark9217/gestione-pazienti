-- Rimuovi le policy esistenti se presenti
drop policy if exists "Doctors can view their own notifications" on notifications;
drop policy if exists "Doctors can insert their own notifications" on notifications;
drop policy if exists "Doctors can update their own notifications" on notifications;
drop policy if exists "Doctors can delete their own notifications" on notifications;

-- Ricrea la tabella da zero
drop table if exists notifications;
create table public.notifications (
    id uuid default uuid_generate_v4() primary key,
    doctor_id uuid references auth.users(id) on delete cascade,
    type varchar(50) not null check (type in ('appointment', 'system', 'reminder')),
    title varchar(255) not null,
    message text not null,
    read boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Abilita RLS
alter table notifications enable row level security;

-- Rimuovi tutte le policy esistenti
drop policy if exists "Enable read for users based on doctor_id" on notifications;
drop policy if exists "Enable insert for users based on doctor_id" on notifications;
drop policy if exists "Enable update for users based on doctor_id" on notifications;
drop policy if exists "Enable delete for users based on doctor_id" on notifications;

-- Crea policy più permissive
create policy "Allow all operations for authenticated users"
    on notifications for all
    using (auth.role() = 'authenticated');

-- Ricrea gli indici
drop index if exists idx_notifications_doctor_id;
drop index if exists idx_notifications_created_at;
drop index if exists idx_notifications_read;

create index idx_notifications_doctor_id on notifications(doctor_id);
create index idx_notifications_created_at on notifications(created_at desc);
create index idx_notifications_read on notifications(read);

-- Funzione per aggiornare updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger per aggiornare updated_at
create trigger set_timestamp
    before update on notifications
    for each row
    execute function update_updated_at_column();
