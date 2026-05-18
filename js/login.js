"use strict";

/**
 * Authentication Controller
 * Handles login UI interactions, client-side validation, and authentication routing.
 */
class AuthController {
    constructor() {
        // 1. Caching DOM Elements (Better performance)
        this.form = document.getElementById("login-form");
        this.emailInput = document.getElementById("email");
        this.passwordInput = document.getElementById("password");
        this.emailError = document.getElementById("email-error");
        this.passwordError = document.getElementById("password-error");
        this.togglePasswordBtn = document.getElementById("btn-toggle-password");
        this.submitBtn = this.form ? this.form.querySelector('button[type="submit"]') : null;

        // 2. Initialization
        this.init();
    }

    init() {
        if (!this.form) return; // Fail-safe (early exit if the form does not exist)
        
        // Attaching events
        this.form.addEventListener("submit", this.handleLogin.bind(this));
        
        if (this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener("click", this.togglePasswordVisibility.bind(this));
        }
    }

    /**
     * Logic for the Show/Hide Password button
     */
    togglePasswordVisibility() {
        const isPassword = this.passwordInput.type === "password";
        
        // Change input type using modern setAttribute
        this.passwordInput.setAttribute("type", isPassword ? "text" : "password");
        
        // Change FontAwesome icon
        const icon = this.togglePasswordBtn.querySelector("i");
        if (icon) {
            icon.classList.toggle("fa-eye", !isPassword);
            icon.classList.toggle("fa-eye-slash", isPassword);
        }
        
        // UX/A11y: Update aria-label for screen readers
        this.togglePasswordBtn.setAttribute(
            "aria-label", 
            isPassword ? "Hide password" : "Show password"
        );
    }

    /**
     * Validates the email address
     * @param {string} email 
     * @returns {string|null} The error message or null if valid
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return "Invalid email address."; // Translated for UI consistency
        }
        return null;
    }

    /**
     * Validates the password
     * @param {string} password 
     * @returns {string|null} The error message or null if valid
     */
    validatePassword(password) {
        if (!password || password.length < 8) {
            return "Password must be at least 8 characters."; // Translated for UI consistency
        }
        return null;
    }

    /**
     * Clears previous error messages
     */
    clearErrors() {
        if (this.emailError) this.emailError.style.display = "none";
        if (this.passwordError) this.passwordError.style.display = "none";
    }

    /**
     * Handles the submit button state (Prevents click spamming)
     * @param {boolean} isLoading 
     */
    setLoadingState(isLoading) {
        if (!this.submitBtn) return;
        
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "Log In";
        }
    }

    /**
     * Main function that runs on form submission
     */
    async handleLogin(event) {
        event.preventDefault(); // Stop page reload
        this.clearErrors();

        const emailValue = this.emailInput.value.trim();
        const passwordValue = this.passwordInput.value;
        let hasErrors = false;

        // --- RUNNING VALIDATIONS ---
        const emailErrMsg = this.validateEmail(emailValue);
        if (emailErrMsg) {
            this.emailError.textContent = emailErrMsg;
            this.emailError.style.display = "block";
            hasErrors = true;
        }

        const passwordErrMsg = this.validatePassword(passwordValue);
        if (passwordErrMsg) {
            this.passwordError.textContent = passwordErrMsg;
            this.passwordError.style.display = "block";
            hasErrors = true;
        }

        // If there are errors, stop execution and return focus
        if (hasErrors) {
            // UX: Place focus on the first field with an error
            if (emailErrMsg) this.emailInput.focus();
            else this.passwordInput.focus();
            return;
        }

        // --- AUTHENTICATION SIMULATION ---
        this.setLoadingState(true);

        try {
            // Simulate a brief network delay (like in a real application)
            await new Promise(resolve => setTimeout(resolve, 800));

            // Requested logic (Default Admin)
            if (emailValue === "admin@autofleet.com" && passwordValue === "password123") {
                
                // Save the session so the Dashboard knows access is granted
                sessionStorage.setItem("is_authenticated", "true");
                
                // Redirect
                window.location.href = "dashboard.html";
                
            } else {
                alert("Incorrect email or password."); // Translated for UI consistency
                
                // UX: If credentials are wrong, clear the password to type it again
                this.passwordInput.value = "";
                this.passwordInput.focus();
            }
        } catch (error) {
            console.error("Auth Error:", error);
            alert("System error. Please try again.");
        } finally {
            // Regardless of success or failure, stop the "Loading" state
            this.setLoadingState(false);
        }
    }
}

// Initialize the application only after all HTML has been loaded in the browser
document.addEventListener("DOMContentLoaded", () => {
    new AuthController();
});