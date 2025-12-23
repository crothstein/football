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
        // Supabase sometimes returns an error even when the user was created
        // (e.g., when trigger fails after user insert). Check if user exists.
        if (error && !data?.user) {
            throw error;
        }
        // If we have a user, return success even if there was an error
        return data;
    }

    async logout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
        this.user = null;
    }

    async resendConfirmation(email) {
        const { error } = await this.supabase.auth.resend({
            type: 'signup',
            email: email
        });
        if (error) throw error;
        return true;
    }

    getUser() {
        return this.user;
    }
}
