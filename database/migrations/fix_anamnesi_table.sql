-- Ricreiamo la tabella anamnesi con la struttura corretta
DROP TABLE IF EXISTS anamnesi;

CREATE TABLE anamnesi (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    paziente_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id uuid REFERENCES doctors(id),
    testo text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_anamnesi_paziente_doctor ON anamnesi(paziente_id, doctor_id);

-- RLS policies
ALTER TABLE anamnesi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own anamnesi" ON anamnesi
    FOR ALL USING (doctor_id = auth.uid());
