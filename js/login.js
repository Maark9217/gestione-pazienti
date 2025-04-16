import { supabase } from './db-config.js';
import { redirectTo, isGitHubPages } from './paths.js';

async function handleLogin(e) {
    e.preventDefault();
    
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        sessionStorage.setItem('authenticated', 'true');
        const redirectPath = isGitHubPages ? '/gestione-pazienti/' : '/';
        window.location.replace(redirectPath);
    } catch (error) {
        console.error('Error:', error);
        alert('Errore di accesso: ' + error.message);
    }
}

document.getElementById('login-form').addEventListener('submit', handleLogin);
