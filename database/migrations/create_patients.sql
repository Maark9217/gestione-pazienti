CREATE TABLE IF NOT EXISTS public.patients (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text,
    surname text,
    birth_date date,
    fiscal_code text,
    phone text,
    email text,
    address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Aggiungi policy per l'accesso
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.patients
    USING (true)
    WITH CHECK (true);
