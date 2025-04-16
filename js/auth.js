import { supabase } from './db-config.js';

export class Auth {
    static async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    }

    static async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    static async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    }

    static async checkAuth() {
        const session = await this.getSession();
        if (!session) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
}
