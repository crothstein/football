import { supabase } from './supabase.js';

export class AuthManager {
    constructor() {
        this.supabase = supabase;
        this.user = null;
    }

    async getSession() {
        const { data, error } = await this.supabase.auth.getSession();
        if (data.session) {
            this.user = data.session.user;
            return data.session;
        }
        return null;
    }

    async login(email, password) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        this.user = data.user;
        return data;
    }

    async signup(email, password, fullName) {
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    // avatar_url can be generated or left null for now
                }
            }
        });
        if (error) throw error;
        // Check if email confirmation is required? usually yes by default in Supabase.
        // But for this simple app we might want to assume auto-login if configured, 
        // or we tell user to check email.
        return data;
    }

    async logout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
        this.user = null;
    }

    getUser() {
        return this.user;
    }
}
