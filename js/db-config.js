const supabaseUrl = 'https://jtubowdckkoltotriubd.supabase.co';
// Chiave anon aggiornata dal Project Settings > API
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dWJvd2Rja2tvbHRvdHJpdWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDMxOTYsImV4cCI6MjA2MDM3OTE5Nn0.NFXL4Z514D8PeHU60rYV730ZsfC0A9ocU5kLK7L8420';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
    db: {
        schema: 'public'
    },
    auth: {
        persistSession: true
    }
});

// Test di connessione semplice
console.log('Testing Supabase connection...');
supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error('Auth check failed:', error);
    } else {
        console.log('Auth check successful:', data);
    }
});

export { supabaseClient as supabase };
