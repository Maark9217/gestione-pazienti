-- Rimuovi il vincolo della chiave esterna
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

-- Aggiungi la colonna per il nome del paziente
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name text;

-- Aggiorna le policy
DROP POLICY IF EXISTS "Enable all for authenticated users" ON appointments;
CREATE POLICY "Enable all operations for users" ON appointments FOR ALL USING (true);
