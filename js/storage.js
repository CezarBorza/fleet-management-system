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
    },
    
    // --- Vignettes Module ---
    getVignettes: async () => {
        try {
            // CORECTAT: Folosim expiration_date pentru sortare
            const { data, error } = await supabaseClient.from('vignettes').select('*').order('expiration_date', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching vignettes:", err);
            throw err;
        }
    },

    addVignette: async (payload) => {
        try {
            const { data, error } = await supabaseClient.from('vignettes').insert([payload]);
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error adding vignette:", err);
            throw err;
        }
    },

    updateVignette: async (id, payload) => {
        try {
            const { data, error } = await supabaseClient.from('vignettes').update(payload).eq('id', id);
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error updating vignette:", err);
            throw err;
        }
    },

    deleteVignette: async (id) => {
        try {
            const { data, error } = await supabaseClient.from('vignettes').delete().eq('id', id);
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error deleting vignette:", err);
            throw err;
        }
    },
    // --- Insurance Module ---
    
    getInsurances: async () => {
        try {
            const { data, error } = await supabaseClient
                .from('insurances')
                .select('*')
                .order('expiration_date', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching insurances:", err);
            throw err;
        }
    },

    addInsurance: async (payload) => {
        try {
            const { data, error } = await supabaseClient
                .from('insurances')
                .insert([payload]);
                
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error adding insurance:", err);
            throw err;
        }
    },

    updateInsurance: async (id, payload) => {
        try {
            const { data, error } = await supabaseClient
                .from('insurances')
                .update(payload)
                .eq('id', id);
                
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error updating insurance:", err);
            throw err;
        }
    },

    deleteInsurance: async (id) => {
        try {
            const { data, error } = await supabaseClient
                .from('insurances')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error deleting insurance:", err);
            throw err;
        }
    },
    // --- Maintenance Module ---
    
    getMaintenanceRecords: async () => {
        try {
            const { data, error } = await supabaseClient
                .from('maintenance')
                .select('*')
                .order('service_date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching maintenance records:", err);
            throw err;
        }
    },

    addMaintenanceRecord: async (payload) => {
        try {
            const { data, error } = await supabaseClient
                .from('maintenance')
                .insert([payload]);
                
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error adding maintenance record:", err);
            throw err;
        }
    },

    updateMaintenanceRecord: async (id, payload) => {
        try {
            const { data, error } = await supabaseClient
                .from('maintenance')
                .update(payload)
                .eq('id', id);
                
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error updating maintenance record:", err);
            throw err;
        }
    },

    deleteMaintenanceRecord: async (id) => {
        try {
            const { data, error } = await supabaseClient
                .from('maintenance')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error deleting maintenance record:", err);
            throw err;
        }
    },

    // --- User & Settings Module ---
    
    /**
     * Retrieves the active user session data securely from Supabase
     */
    getCurrentUser: async () => {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            if (error) throw error;
            return user;
        } catch (err) {
            console.error("Error fetching current user:", err.message);
            return null;
        }
    },

    /**
     * Updates the password for the currently authenticated user
     * @param {string} newPassword 
     */
    updatePassword: async (newPassword) => {
        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error("Error updating password:", err.message);
            return { success: false, message: err.message };
        }
    }
};