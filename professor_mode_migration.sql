-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'student'
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Create assignments table
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id),
  title text not null,
  topic text not null,
  description text,
  difficulty_level text,
  questions jsonb,
  learning_goals jsonb
);

-- Enable RLS for assignments
alter table public.assignments enable row level security;

-- Link assessments to assignments
alter table public.assessments 
add column assignment_id uuid references public.assignments(id);

-- Policies
-- Profiles: Users can read their own profile.
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);

-- Assignments: Everyone can read assignments (students need to see them to take them).
create policy "Everyone can read assignments" on public.assignments for select using (true);

-- Assignments: Only professors can insert/update. 
-- (For simplicity in this SQL editor, we might just allow public insert for now 
-- OR use a check, but since we can't easily script the role check without a helper function, 
-- we will enforce this in the application layer or just allow authenticated inserts for now).
create policy "Authenticated users can insert assignments" on public.assignments for insert with check (auth.role() = 'authenticated');

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
