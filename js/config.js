import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const SUPABASE_URL = 'https://jtubowdckkoltotriubd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dWJvd2Rja2tvbHRvdHJpdWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDMxOTYsImV4cCI6MjA2MDM3OTE5Nn0.NFXL4Z514D8PeHU60rYV730ZsfC0A9ocU5kLK7L8420'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Aggiungi helper functions per i dottori
export const getDoctorInfo = async (userId) => {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

// Aggiungi helper functions per gli appuntamenti
export const getAppointments = async (doctorId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            patients (name, surname)
        `)
        .eq('doctor_id', doctorId)
        .order('date', { ascending: true });
    
    if (error) throw error;
    return data || [];
}

export const addAppointment = async (appointmentData) => {
    const { data, error } = await supabase
        .from('appointments')
        .insert({
            ...appointmentData,
            notes: appointmentData.notes || ''  // Assicuriamo che le note siano sempre definite
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export const updateAppointment = async (id, updates) => {
    const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export const deleteAppointment = async (id) => {
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return true;
}

export const searchPatients = async (query) => {
    const { data, error } = await supabase
        .from('patients')
        .select('id, name, surname')
        .or(`name.ilike.%${query}%,surname.ilike.%${query}%`)
        .limit(10);
    
    if (error) throw error;
    return data || [];
}

export const getPatientDetails = async (patientId) => {
    const { data, error } = await supabase
        .from('patients')
        .select(`
            *,
            appointments (
                id,
                date,
                duration,
                notes
            )
        `)
        .eq('id', patientId)
        .single();
    
    if (error) throw error;
    return data;
}

export const addNewPatient = async (patientData) => {
    const { data, error } = await supabase
        .from('patients')
        .insert(patientData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export const updatePatient = async (id, updates) => {
    const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}
