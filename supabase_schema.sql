-- Create assessments table
create table public.assessments (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  topic text not null,
  student_name text,
  total_score integer,
  feedback text,
  status text not null default 'pending', -- 'pending', 'completed'
  constraint assessments_pkey primary key (id)
);

-- Create messages table
create table public.messages (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  assessment_id uuid not null,
  role text not null, -- 'user', 'assistant', 'system'
  content text not null,
  constraint messages_pkey primary key (id),
  constraint messages_assessment_id_fkey foreign key (assessment_id) references public.assessments (id) on delete cascade
);

-- Enable RLS (Row Level Security)
alter table public.assessments enable row level security;
alter table public.messages enable row level security;

-- Create policies (modify as needed for auth, currently allowing public access for demo)
-- Ideally you would restrict this to authenticated users
create policy "Enable read access for all users" on public.assessments for select using (true);
create policy "Enable insert access for all users" on public.assessments for insert with check (true);
create policy "Enable update access for all users" on public.assessments for update using (true);

create policy "Enable read access for all users" on public.messages for select using (true);
create policy "Enable insert access for all users" on public.messages for insert with check (true);
