"use strict";

/**
 * Insurance Controller
 * Handles the logic for managing RCA/CASCO records, validating strict dates,
 * parsing foreign keys securely, and computing expiration badges.
 */
class InsuranceController {
    constructor() {
        // Form Elements
        this.form = document.getElementById("insurance-form");
        this.formTitle = document.getElementById("form-title");
        this.idInput = document.getElementById("insurance-id");
        this.vehicleInput = document.getElementById("vehicle-id");
        this.typeInput = document.getElementById("insurance-type");
        this.providerInput = document.getElementById("provider");
        this.costInput = document.getElementById("cost");
        this.startInput = document.getElementById("start-date");
        this.expirationInput = document.getElementById("expiration-date");
        
        this.btnCancel = document.getElementById("btn-cancel");
        
        // Table Elements
        this.tableBody = document.getElementById("insurances-table-body");

        // Application State
        this.vehiclesMap = {}; // Lookup map for O(1) plate retrieval
        this.insurancesList = [];

        this.init();
    }

    async init() {
        // Enforce Session Auth Guardrail
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html");
            return;
        }

        this.bindEvents();
        await this.loadVehicles();
        await this.loadInsurances();
    }

    bindEvents() {
        this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
        this.btnCancel.addEventListener("click", this.resetForm.bind(this));
    }

    /**
     * Fetch vehicles to populate dropdown and memory map
     */
    async loadVehicles() {
        try {
            const vehicles = await DatabaseEngine.getVehicles();
            this.vehicleInput.innerHTML = '<option value="" disabled selected>Select a vehicle...</option>';
            
            vehicles.forEach(vehicle => {
                const plate = vehicle.license_plate || `Vehicle #${vehicle.id}`;
                this.vehiclesMap[vehicle.id] = plate;
                
                const option = document.createElement("option");
                option.value = vehicle.id;
                option.textContent = plate;
                this.vehicleInput.appendChild(option);
            });
        } catch (error) {
            console.error("Failed to load vehicles lookup:", error);
        }
    }

    /**
     * Fetch all insurance records and render to table
     */
    async loadInsurances() {
        try {
            this.insurancesList = await DatabaseEngine.getInsurances();
            this.renderTable();
        } catch (error) {
            console.error("Failed to load insurances:", error);
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--brand-danger);">Failed to retrieve data from database.</td></tr>';
        }
    }

    /**
     * Strict client-side validation logic
     * @returns {boolean} true if valid, false otherwise
     */
    validateForm() {
        let isValid = true;
        
        const toggleError = (fieldId, show) => {
            const errorElement = document.getElementById(`err-${fieldId}`);
            if (errorElement) {
                errorElement.style.display = show ? "block" : "none";
            }
            if (show) isValid = false;
        };

        // Reset all visual error states
        ['vehicle', 'type', 'provider', 'cost', 'start', 'expiration'].forEach(id => toggleError(id, false));

        // 1. Mandatory Fields
        if (!this.vehicleInput.value) toggleError('vehicle', true);
        if (!this.typeInput.value) toggleError('type', true);
        if (!this.providerInput.value.trim()) toggleError('provider', true);
        if (!this.startInput.value) toggleError('start', true);

        // 2. Cost strictly > 0
        const costValue = parseFloat(this.costInput.value);
        if (isNaN(costValue) || costValue <= 0) toggleError('cost', true);

        // 3. Expiration strictly greater than start chronologically
        if (!this.expirationInput.value) {
            toggleError('expiration', true);
        } else if (this.startInput.value) {
            const startDate = new Date(this.startInput.value);
            const expirationDate = new Date(this.expirationInput.value);
            
            if (expirationDate <= startDate) {
                toggleError('expiration', true);
            }
        }

        return isValid;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) return;

        // Construct Database Payload matching exact schema requirements
        const payload = {
            vehicle_id: parseInt(this.vehicleInput.value, 10), // Explicit casting to prevent Postgres type conflicts
            insurance_type: this.typeInput.value,
            provider: this.providerInput.value.trim(),
            cost: parseFloat(this.costInput.value),
            start_date: this.startInput.value,
            expiration_date: this.expirationInput.value 
        };

        const id = this.idInput.value;

        try {
            if (id) {
                await DatabaseEngine.updateInsurance(id, payload);
            } else {
                await DatabaseEngine.addInsurance(payload);
            }
            
            this.resetForm();
            await this.loadInsurances();
        } catch (error) {
            alert("Database Error: Could not save the insurance record.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    /**
     * Compute dynamic badge HTML based on a 30-day window
     * @param {string} expirationDateStr 
     * @returns {string} HTML span element
     */
    calculateStatusHTML(expirationDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const expirationDate = new Date(expirationDateStr);
        const diffTime = expirationDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `<span class="badge badge-danger">Expired</span>`;
        } else if (diffDays <= 30) {
            return `<span class="badge badge-warning">Expiring (${diffDays}d)</span>`;
        } else {
            return `<span class="badge badge-success">Active</span>`;
        }
    }

    renderTable() {
        this.tableBody.innerHTML = "";

        if (this.insurancesList.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No insurances found.</td></tr>';
            return;
        }

        this.insurancesList.forEach(ins => {
            const tr = document.createElement("tr");
            
            const vehiclePlate = this.vehiclesMap[ins.vehicle_id] || `ID: ${ins.vehicle_id}`;
            const statusBadge = this.calculateStatusHTML(ins.expiration_date); 

            tr.innerHTML = `
                <td><strong>${vehiclePlate}</strong></td>
                <td>${ins.insurance_type}</td>
                <td>${ins.provider}</td>
                <td>€${parseFloat(ins.cost).toFixed(2)}</td>
                <td>${ins.start_date}</td>
                <td>${ins.expiration_date}</td> 
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="insuranceCtrl.editRecord('${ins.id}')" aria-label="Edit Record">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="insuranceCtrl.deleteRecord('${ins.id}')" aria-label="Delete Record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    editRecord(id) {
        const ins = this.insurancesList.find(i => i.id == id);
        if (!ins) return;

        this.formTitle.textContent = "Edit Insurance Policy";
        this.idInput.value = ins.id;
        this.vehicleInput.value = ins.vehicle_id;
        this.typeInput.value = ins.insurance_type;
        this.providerInput.value = ins.provider;
        this.costInput.value = ins.cost;
        this.startInput.value = ins.start_date;
        this.expirationInput.value = ins.expiration_date; 
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async deleteRecord(id) {
        if (!confirm("Are you sure you want to permanently delete this insurance record?")) return;

        try {
            await DatabaseEngine.deleteInsurance(id);
            await this.loadInsurances();
        } catch (error) {
            alert("Database Error: Failed to delete the record.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    resetForm() {
        this.form.reset();
        this.idInput.value = "";
        this.formTitle.textContent = "Add New Insurance Policy";
        
        // Hide all error messages immediately
        ['vehicle', 'type', 'provider', 'cost', 'start', 'expiration'].forEach(id => {
            const errSpan = document.getElementById(`err-${id}`);
            if (errSpan) errSpan.style.display = "none";
        });
    }
}

// Global Controller Instance for inline table button actions
let insuranceCtrl;
document.addEventListener("DOMContentLoaded", () => {
    insuranceCtrl = new InsuranceController();
});