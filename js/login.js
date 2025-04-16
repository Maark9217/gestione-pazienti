import { supabase } from './config.js';
import { getPath } from './paths.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        if (data.user) {
            sessionStorage.setItem('authenticated', 'true');
            window.location.href = getPath('index.html');
        }
    } catch (error) {
        alert('Errore di login: ' + error.message);
    }
});
