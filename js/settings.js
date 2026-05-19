"use strict";

/**
 * Settings Controller
 * Handles user profile data retrieval and secure password update workflows.
 */
class SettingsController {
    constructor() {
        // Elements
        this.form = document.getElementById("password-form");
        this.emailInput = document.getElementById("current-email");
        this.newPasswordInput = document.getElementById("new-password");
        this.confirmPasswordInput = document.getElementById("confirm-password");
        this.successAlert = document.getElementById("alert-success");
        this.navEmailDisplay = document.getElementById("nav-user-email");
        this.submitBtn = document.getElementById("btn-save");

        this.init();
    }

    async init() {
        // Enforce Session Auth Guardrail
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html");
            return;
        }

        this.bindEvents();
        await this.loadUserProfile();
    }

    bindEvents() {
        this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
    }

    /**
     * Retrieves the current authenticated user from Supabase and populates UI
     */
    async loadUserProfile() {
        try {
            const user = await DatabaseEngine.getCurrentUser();
            if (user && user.email) {
                this.emailInput.value = user.email;
                if (this.navEmailDisplay) {
                    this.navEmailDisplay.textContent = user.email;
                }
            } else {
                this.emailInput.value = "Email not found.";
            }
        } catch (error) {
            console.error("Failed to load user profile:", error);
            this.emailInput.value = "Error loading profile.";
        }
    }

    /**
     * Strict client-side validation logic for passwords
     * @returns {boolean}
     */
    validateForm() {
        let isValid = true;
        
        const toggleError = (fieldId, show) => {
            const el = document.getElementById(`err-${fieldId}`);
            if (el) el.style.display = show ? "block" : "none";
            if (show) isValid = false;
        };

        // Reset errors
        ['password', 'confirm'].forEach(id => toggleError(id, false));
        this.successAlert.style.display = "none";

        const newPass = this.newPasswordInput.value;
        const confirmPass = this.confirmPasswordInput.value;

        // 1. Minimum 8 characters
        if (newPass.length < 8) {
            toggleError('password', true);
        }

        // 2. Exact match check
        if (newPass !== confirmPass || confirmPass.length === 0) {
            toggleError('confirm', true);
        }

        return isValid;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) return;

        // Visual feedback during async operation
        const originalBtnText = this.submitBtn.textContent;
        this.submitBtn.textContent = "Updating...";
        this.submitBtn.disabled = true;

        try {
            const response = await DatabaseEngine.updatePassword(this.newPasswordInput.value);
            
            if (response.success) {
                // Show success banner and clear fields
                this.successAlert.style.display = "block";
                this.form.reset();
            } else {
                alert(`Error: ${response.message}`);
            }
        } catch (error) {
            alert("A critical error occurred while updating the password.");
            console.error(error);
        } finally {
            // Restore button state
            this.submitBtn.textContent = originalBtnText;
            this.submitBtn.disabled = false;
        }
    }
}

// Instantiate controller
document.addEventListener("DOMContentLoaded", () => {
    new SettingsController();
});