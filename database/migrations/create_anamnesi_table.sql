-- Crea la tabella anamnesi
CREATE TABLE IF NOT EXISTS anamnesi (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    paziente_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id uuid REFERENCES doctors(id),
    testo text,
    data timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_anamnesi_paziente_id ON anamnesi(paziente_id);
CREATE INDEX IF NOT EXISTS idx_anamnesi_doctor_id ON anamnesi(doctor_id);

-- Abilita Row Level Security
ALTER TABLE anamnesi ENABLE ROW LEVEL SECURITY;

-- Crea policy per permettere accesso solo alle proprie anamnesi
CREATE POLICY "Users can only access their own anamnesi"
ON anamnesi
FOR ALL
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());
