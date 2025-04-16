-- Aggiungi la colonna anamnesi alla tabella patients
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS anamnesi text;

-- Aggiorna le policy per permettere l'aggiornamento
ALTER POLICY "Users can only see their own patients" 
ON patients 
FOR UPDATE
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());
