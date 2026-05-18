"use strict";

/**
 * Dashboard Controller
 * Handles route protection and aggregates fleet data from Supabase 
 * to dynamically update the UI metrics.
 */
class DashboardController {
    constructor() {
        // 1. Enforce Authentication Guardrail
        this.checkAuthentication();

        // 2. Cache DOM Elements
        this.totalVehiclesLbl = document.getElementById("lbl-total-vehicles");
        this.totalAlertsLbl = document.getElementById("lbl-total-alerts");
        this.alertsContainer = document.getElementById("alerts-container");
        this.noAlertsMsg = document.getElementById("lbl-no-alerts");

        // 3. Initialize Dashboard Data
        this.init();
    }

    /**
     * Verifies if the user holds a valid session token.
     * Redirects to the login interface if unauthenticated.
     */
    checkAuthentication() {
        const isAuthenticated = sessionStorage.getItem("is_authenticated");
        if (isAuthenticated !== "true") {
            // Using replace() to prevent the user from using the browser's back button
            window.location.replace("index.html"); 
        }
    }

    /**
     * Main initialization sequence for data fetching
     */
    async init() {
        await this.loadVehicleMetrics();
        // Additional metric loaders (e.g., loadDrivers, loadAlerts) can be added here later
    }

    /**
     * Fetches vehicle data via the storage engine and updates the KPI card
     */
    async loadVehicleMetrics() {
        if (!this.totalVehiclesLbl) return;

        try {
            // Fetch data array from Supabase using our centralized DatabaseEngine
            const vehiclesList = await DatabaseEngine.getVehicles();
            
            // Update the DOM with the actual array length
            this.totalVehiclesLbl.textContent = vehiclesList.length;

        } catch (error) {
            console.error("Failed to load vehicle metrics:", error);
            this.totalVehiclesLbl.textContent = "Err";
        }
    }
}

// Instantiate the dashboard controller once the DOM is fully parsed
document.addEventListener("DOMContentLoaded", () => {
    new DashboardController();
});