import { supabase } from './db-config.js';

async function handleLogin(email, password) {
    try {
        // Prima verifica le credenziali
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('id, name')
            .eq('email', email)
            .single();

        if (error || !doctor) {
            throw new Error('Credenziali non valide');
        }

        // Salva i dati del dottore nella sessione
        window.currentDoctor = doctor;
        sessionStorage.setItem('currentDoctor', JSON.stringify(doctor));
        sessionStorage.setItem('authenticated', 'true');
        
        window.location.href = '/';
    } catch (error) {
        alert('Errore di accesso: ' + error.message);
    }
}

// Esponi la funzione globalmente
window.handleLogin = handleLogin;
