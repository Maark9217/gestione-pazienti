-- Aggiungi doctor_id alla tabella diagnosi
ALTER TABLE diagnosi 
ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES doctors(id);

-- Aggiorna policy per diagnosi
CREATE POLICY "Users can only see their own diagnoses"
ON diagnosi
FOR ALL
USING (doctor_id = auth.uid());
