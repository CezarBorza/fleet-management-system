"use strict";

/**
 * Global Application Controller (main.js)
 * Manages UI components present across all pages: Dark Mode toggle, 
 * Mobile Sidebar navigation, and Logout session management.
 */
document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================================
       1. DARK MODE TOGGLE LOGIC
       ========================================================================== */
    const themeBtn = document.getElementById("btn-theme-toggle");
    const htmlElement = document.documentElement; // Selects the <html> element

    // A. Check localStorage for user's previous theme preference
    if (localStorage.getItem("theme") === "dark") {
        htmlElement.setAttribute("data-theme", "dark");
        if (themeBtn) {
            themeBtn.innerHTML = '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
        }
    }

    // B. Handle theme toggle click events
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const currentTheme = htmlElement.getAttribute("data-theme");
            
            if (currentTheme === "dark") {
                // Switch to Light Mode
                htmlElement.removeAttribute("data-theme");
                localStorage.setItem("theme", "light");
                themeBtn.innerHTML = '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
            } else {
                // Switch to Dark Mode
                htmlElement.setAttribute("data-theme", "dark");
                localStorage.setItem("theme", "dark");
                themeBtn.innerHTML = '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
            }
        });
    }

/* ==========================================================================
       2. MOBILE & DESKTOP SIDEBAR NAVIGATION LOGIC
       ========================================================================== */
    const menuBtn = document.getElementById("btn-toggle-menu"); // The hamburger menu button
    const sidebar = document.getElementById("sidebar"); // The side navigation container
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", () => {
            // Check current window width to determine the device type
            if (window.innerWidth <= 768) {
                // On mobile: sidebar is hidden by default. Toggle 'is-open' to show it.
                sidebar.classList.toggle("is-open");
            } else {
                // On desktop: sidebar is visible by default. Toggle 'is-collapsed' to hide it.
                sidebar.classList.toggle("is-collapsed");
            }
        });
    }

    /* ==========================================================================
       3. LOGOUT SESSION MANAGEMENT
       ========================================================================== */
    const logoutBtn = document.querySelector(".logout-link");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // Clear authentication flag from browser session storage
            sessionStorage.removeItem("is_authenticated");
            // The anchor's href attribute (index.html) will handle the redirect
        });
    }
    

    /* ==========================================================================
       4. PROFILE DROPDOWN LOGIC
       ========================================================================== */
    const profileBtn = document.getElementById("btn-profile");
    const profileMenu = document.getElementById("profile-menu");

    if (profileBtn && profileMenu) {
        // Deschide/Închide meniul la click pe buton
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Oprește click-ul din a se propaga în restul paginii
            profileMenu.classList.toggle("is-active");
            
            // Actualizează atributele de accesibilitate pentru screen readere
            const isExpanded = profileMenu.classList.contains("is-active");
            profileBtn.setAttribute("aria-expanded", isExpanded);
        });

        // Închide meniul automat dacă dai click oriunde altundeva pe ecran
        document.addEventListener("click", (e) => {
            if (!profileMenu.contains(e.target)) {
                profileMenu.classList.remove("is-active");
                profileBtn.setAttribute("aria-expanded", "false");
            }
        });
    }
    /* ==========================================================================
       5. POPULATE GLOBAL NAV EMAIL
       ========================================================================== */
    const navEmailDisplay = document.getElementById("global-nav-user-email");
    if (navEmailDisplay && sessionStorage.getItem("is_authenticated") === "true") {
        // We use an IIFE (Immediately Invoked Function Expression) to handle the async call
        (async () => {
            try {
                // Ensure DatabaseEngine is loaded before calling
                if (typeof DatabaseEngine !== 'undefined') {
                    const user = await DatabaseEngine.getCurrentUser();
                    if (user && user.email) {
                        navEmailDisplay.textContent = user.email;
                    } else {
                        navEmailDisplay.textContent = "Unknown User";
                    }
                }
            } catch (error) {
                console.error("Failed to load user email for Navbar:", error);
                navEmailDisplay.textContent = "Error";
            }
        })();
    }







});