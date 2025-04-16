import { getPath, redirectTo } from './paths.js';
import { supabase } from './db-config.js';

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
        redirectTo('index.html');
    } catch (error) {
        console.error('Error:', error);
        alert('Errore di accesso: ' + error.message);
    }
}

document.getElementById('login-form').addEventListener('submit', handleLogin);
