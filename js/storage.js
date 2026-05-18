"use strict";

// Initialize Supabase (using the library included in the HTML)
const SUPABASE_URL = 'https://cbhvucjovhagqrblzyud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaHZ1Y2pvdmhhZ3FyYmx6eXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTYyMjYsImV4cCI6MjA5NDY3MjIyNn0.ZdJicOO-YYhtZWKIWWe9QE5GUKluVsuFiYfJDtiP87A';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DatabaseEngine = {
    // --- Authentication / Verification (Supabase Auth Real) ---
    login: async (email, password) => {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (err) {
            console.error("Login error:", err.message);
            return { success: false, message: err.message };
        }
    },

    register: async (email, password) => {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (err) {
            console.error("Register error:", err.message);
            return { success: false, message: err.message };
        }
    },

    // --- Vehicles ---
    getVehicles: async () => {
        try {
            const { data, error } = await supabaseClient.from('vehicles').select('*');
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching vehicles:", err);
            return [];
        }
    }
    // Your teammates can add the functions for the remaining modules here
};