"use strict";

/**
 * Authentication Controller
 * Handles login and registration UI interactions, client-side validation, 
 * and authentication routing via Supabase.
 */
class AuthController {
    constructor() {
        // 1. Caching DOM Elements
        this.form = document.getElementById("login-form");
        this.emailInput = document.getElementById("email");
        this.passwordInput = document.getElementById("password");
        this.emailError = document.getElementById("email-error");
        this.passwordError = document.getElementById("password-error");
        
        this.togglePasswordBtn = document.getElementById("btn-toggle-password");
        this.submitBtn = document.getElementById("main-submit-btn");
        
        // Elements for toggling between Login and Sign Up modes
        this.toggleModeLink = document.getElementById("toggle-mode-link");
        this.toggleText = document.getElementById("toggle-text");
        this.headerTitle = document.querySelector(".content-header h1");
        this.headerDesc = document.querySelector(".content-header p");

        // Application State (Defaults to Login mode)
        this.isLoginMode = true;

        // 2. Initialization
        this.init();
    }

    init() {
        if (!this.form) return; // Fail-safe check
        
        // Attach event listeners
        this.form.addEventListener("submit", this.handleAuth.bind(this));
        
        if (this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener("click", this.togglePasswordVisibility.bind(this));
        }

        if (this.toggleModeLink) {
            this.toggleModeLink.addEventListener("click", (e) => {
                e.preventDefault();
                this.switchMode();
            });
        }
    }

    /**
     * Toggles the UI between "Log In" and "Sign Up" modes
     */
    switchMode() {
        this.isLoginMode = !this.isLoginMode;
        this.clearErrors();
        this.emailInput.value = "";
        this.passwordInput.value = "";

        if (this.isLoginMode) {
            this.headerTitle.innerHTML = '<i class="fa-solid fa-car-rear" aria-hidden="true"></i> AutoFleet';
            this.headerDesc.textContent = "Enter your credentials to access the system";
            this.submitBtn.textContent = "Log In";
            this.toggleText.textContent = "Don't have an account?";
            this.toggleModeLink.textContent = "Create one here";
        } else {
            this.headerTitle.innerHTML = '<i class="fa-solid fa-user-plus" aria-hidden="true"></i> Create Account';
            this.headerDesc.textContent = "Register a new administrator account";
            this.submitBtn.textContent = "Sign Up";
            this.toggleText.textContent = "Already have an account?";
            this.toggleModeLink.textContent = "Log in here";
        }
    }

    /**
     * Toggles password visibility (text / password type)
     */
    togglePasswordVisibility() {
        const isPassword = this.passwordInput.type === "password";
        this.passwordInput.setAttribute("type", isPassword ? "text" : "password");
        
        const icon = this.togglePasswordBtn.querySelector("i");
        if (icon) {
            icon.classList.toggle("fa-eye", !isPassword);
            icon.classList.toggle("fa-eye-slash", isPassword);
        }
        
        // Accessibility update
        this.togglePasswordBtn.setAttribute(
            "aria-label", 
            isPassword ? "Hide password" : "Show password"
        );
    }

    /**
     * Validates the email format
     * @param {string} email 
     * @returns {string|null} Error message or null
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) return "Invalid email address.";
        return null;
    }

    /**
     * Validates password length and presence
     * @param {string} password 
     * @returns {string|null} Error message or null
     */
    validatePassword(password) {
        if (!password || password.length < 8) return "Password must be at least 8 characters.";
        return null;
    }

    /**
     * Hides all validation error messages
     */
    clearErrors() {
        if (this.emailError) this.emailError.style.display = "none";
        if (this.passwordError) this.passwordError.style.display = "none";
    }

    /**
     * Manages the loading state of the submit button
     * @param {boolean} isLoading 
     */
    setLoadingState(isLoading) {
        if (!this.submitBtn) return;
        
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = this.isLoginMode ? "Log In" : "Sign Up";
        }
    }

    /**
     * Handles the form submission for both Login and Registration
     */
    async handleAuth(event) {
        event.preventDefault();
        this.clearErrors();

        const emailValue = this.emailInput.value.trim();
        const passwordValue = this.passwordInput.value;
        let hasErrors = false;

        // --- VALIDATION CHECK ---
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

        if (hasErrors) {
            if (emailErrMsg) this.emailInput.focus();
            else this.passwordInput.focus();
            return;
        }

        // --- AUTHENTICATION REQUEST ---
        this.setLoadingState(true);

        try {
            let response;
            
            // Execute the appropriate API call based on current mode
            if (this.isLoginMode) {
                response = await DatabaseEngine.login(emailValue, passwordValue);
            } else {
                response = await DatabaseEngine.register(emailValue, passwordValue);
            }

            if (response.success) {
                // Authentication successful, store session flag and redirect
                sessionStorage.setItem("is_authenticated", "true");
                window.location.href = "dashboard.html";
            } else {
                // Display error from Supabase (e.g., wrong password, email already exists)
                alert(response.message);
                
                // Clear password field for security and better UX
                this.passwordInput.value = "";
                this.passwordInput.focus();
            }
        } catch (error) {
            console.error("Auth Error:", error);
            alert("System error. Please try again later.");
        } finally {
            this.setLoadingState(false);
        }
    }
}

// Initialize the controller once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    new AuthController();
});