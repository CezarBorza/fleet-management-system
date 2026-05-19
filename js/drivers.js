"use strict";

class DriversController {
    constructor() {

        this.form = document.getElementById("driver-form");
        this.formTitle = document.getElementById("form-title");
        this.idInput = document.getElementById("driver-id");
        this.firstNameInput = document.getElementById("first-name");
        this.lastNameInput = document.getElementById("last-name");
        this.emailInput = document.getElementById("email");
        this.phoneInput = document.getElementById("phone");
        this.licenseNumberInput = document.getElementById("license-number");
        this.licenseCategoryInput = document.getElementById("license-category");
        this.expirationDateInput = document.getElementById("expiration-date");
        this.vehicleInput = document.getElementById("assigned-vehicle-id");
        
        this.btnCancel = document.getElementById("btn-cancel");
        
        this.tableBody = document.getElementById("drivers-table-body");

        this.vehiclesMap = {};
        this.driversList = [];

        this.init();
    }

    async init() {
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html");
            return;
        }

        this.bindEvents();
        await this.loadVehiclesLookup();
        await this.loadDriverRecords();
    }

    bindEvents() {
        if (this.form) this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
        if (this.btnCancel) this.btnCancel.addEventListener("click", this.resetForm.bind(this));
    }


    async loadVehiclesLookup() {
        try {
            const { data: vehicles, error } = await window.supabaseClient
                .from("vehicles")
                .select("id, license_plate, make, model");

            if (error) throw error;

            if (this.vehicleInput) {
                this.vehicleInput.innerHTML = '<option value="" selected>No vehicle assigned</option>';
                
                vehicles.forEach(vehicle => {
                    const label = `${vehicle.license_plate} (${vehicle.make} ${vehicle.model})`;
                    this.vehiclesMap[vehicle.id] = vehicle.license_plate;
                    
                    const option = document.createElement("option");
                    option.value = vehicle.id;
                    option.textContent = label;
                    this.vehicleInput.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Failed to load vehicle lookup references:", error);
        }
    }

    async loadDriverRecords() {
        try {
            const { data, error } = await window.supabaseClient
                .from("drivers")
                .select("*")
                .order("id", { ascending: false });

            if (error) throw error;

            this.driversList = data || [];
            this.renderTable();
        } catch (error) {
            console.error("Failed to load driver records:", error);
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--brand-danger);">Failed to retrieve data from database.</td></tr>';
        }
    }

    validateForm() {
        let isValid = true;
        
        const toggleError = (fieldId, show) => {
            const el = document.getElementById(`err-${fieldId}`);
            if (el) el.style.display = show ? "block" : "none";
            if (show) isValid = false;
        };

        ["first-name", "last-name", "email", "phone", "license", "expiration"].forEach(id => toggleError(id, false));

        if (!this.firstNameInput.value.trim()) toggleError("first-name", true);
        if (!this.lastNameInput.value.trim()) toggleError("last-name", true);
        if (!this.licenseNumberInput.value.trim()) toggleError("license", true);
        if (!this.expirationDateInput.value) toggleError("expiration", true);

        const emailValue = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailValue && !emailRegex.test(emailValue)) toggleError("email", true);

        const phoneValue = this.phoneInput.value.trim();
        const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;
        if (phoneValue && !phoneRegex.test(phoneValue)) toggleError("phone", true);

        return isValid;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) return;

        const payload = {
            first_name: this.firstNameInput.value.trim(),
            last_name: this.lastNameInput.value.trim(),
            email: this.emailInput.value.trim() || null,
            phone: this.phoneInput.value.trim() || null,
            license_number: this.licenseNumberInput.value.trim().toUpperCase(),
            license_category: this.licenseCategoryInput.value.trim().toUpperCase() || null,
            expiration_date: this.expirationDateInput.value,
            assigned_vehicle_id: this.vehicleInput.value ? parseInt(this.vehicleInput.value, 10) : null
        };

        const id = this.idInput.value;

        try {
            if (id) {
                const { error } = await window.supabaseClient.from("drivers").update(payload).eq("id", id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from("drivers").insert([payload]);
                if (error) throw error;
            }
            
            this.resetForm();
            await this.loadDriverRecords();
        } catch (error) {
            alert("Database Error: Could not save the driver profile.");
            console.error("SUPABASE ERROR:", error);
        }
    }


    calculateExpirationBadgeHTML(expirationDateStr) {
        const expirationDate = new Date(expirationDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = expirationDate - today;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            return `<span class="badge badge-danger">Permis Expirat</span>`;
        } else if (daysRemaining <= 30) {
            return `<span class="badge badge-warning">Expiră în ${daysRemaining} zile</span>`;
        }

        return `<span class="badge badge-success">Valid</span>`;
    }

    renderTable() {
        this.tableBody.innerHTML = "";

        if (this.driversList.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No drivers profiles documented.</td></tr>';
            return;
        }

        this.driversList.forEach(record => {
            const tr = document.createElement("tr");
            
            const fullName = `${record.first_name} ${record.last_name}`;
            const vehiclePlate = this.vehiclesMap[record.assigned_vehicle_id] || '-';
            const statusBadge = this.calculateExpirationBadgeHTML(record.expiration_date);

            tr.innerHTML = `
                <td><strong>${this.escapeHtml(fullName)}</strong></td>
                <td>${this.escapeHtml(record.email || '-')}</td>
                <td>${this.escapeHtml(record.phone || '-')}</td>
                <td>${this.escapeHtml(record.license_number)} (${this.escapeHtml(record.license_category || '-')})</td>
                <td>${record.expiration_date}</td>
                <td><span style="font-weight:600; color:var(--brand-primary);">${this.escapeHtml(vehiclePlate)}</span></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="driversCtrl.editRecord('${record.id}')" aria-label="Edit Driver Profile">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="driversCtrl.deleteRecord('${record.id}')" aria-label="Delete Driver Profile">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    editRecord(id) {
        const record = this.driversList.find(r => r.id == id);
        if (!record) return;

        this.formTitle.textContent = "Edit Driver Profile";
        this.idInput.value = record.id;
        this.firstNameInput.value = record.first_name;
        this.lastNameInput.value = record.last_name;
        this.emailInput.value = record.email || "";
        this.phoneInput.value = record.phone || "";
        this.licenseNumberInput.value = record.license_number;
        this.licenseCategoryInput.value = record.license_category || "";
        this.expirationDateInput.value = record.expiration_date;
        this.vehicleInput.value = record.assigned_vehicle_id || "";
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async deleteRecord(id) {
        if (!confirm("Sigur doriți să ștergeți acest profil de șofer?")) return;

        try {
            const { error } = await window.supabaseClient.from("drivers").delete().eq("id", id);
            if (error) throw error;
            await this.loadDriverRecords();
        } catch (error) {
            alert("Database Error: Failed to remove driver instance row mapping.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    resetForm() {
        this.form.reset();
        this.idInput.value = "";
        this.formTitle.textContent = "Log New Driver Profile";
        
        ["first-name", "last-name", "email", "phone", "license", "expiration"].forEach(id => {
            const el = document.getElementById(`err-${id}`);
            if (el) el.style.display = "none";
        });
    }

    escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

let driversCtrl;
document.addEventListener("DOMContentLoaded", () => {
    driversCtrl = new DriversController();
});