-- Creazione tabella appuntamenti
CREATE TABLE IF NOT EXISTS public.appuntamenti (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    paziente_id uuid REFERENCES public.pazienti(id) ON DELETE CASCADE,
    data timestamp with time zone NOT NULL,
    durata integer NOT NULL DEFAULT 30, -- durata in minuti
    note text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Aggiungi policy per l'accesso
ALTER TABLE public.appuntamenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.appuntamenti
    USING (true)
    WITH CHECK (true);
