-- Aggiungi la colonna doctor_id alla tabella patients
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES doctors(id);

-- Crea un indice per migliorare le performance delle query
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients(doctor_id);

-- Aggiungi policy per l'accesso basato su doctor_id
CREATE POLICY "Users can only see their own patients"
ON patients
FOR ALL
USING (doctor_id = auth.uid());

-- Assicurati che la RLS sia abilitata
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
