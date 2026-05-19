"use strict";


class VehiclesController {
    constructor() {
        this.form = document.getElementById("vehicle-form");
        this.formTitle = document.getElementById("form-title");
        this.idInput = document.getElementById("vehicle-id");
        this.licensePlateInput = document.getElementById("registration-number");
        this.makeInput = document.getElementById("brand");
        this.modelInput = document.getElementById("model");
        this.yearInput = document.getElementById("year");
        this.mileageInput = document.getElementById("mileage");
        this.vinInput = document.getElementById("vin");
        this.fuelTypeInput = document.getElementById("fuel-type");
        this.statusInput = document.getElementById("status");
        this.colorInput = document.getElementById("color");
        
        this.btnCancel = document.getElementById("btn-cancel");
        
        this.tableBody = document.getElementById("vehicles-table-body");
        this.searchInput = document.querySelector(".toolbar input[type='text']");
        this.statusFilter = document.querySelector(".toolbar select:nth-of-type(1)");
        this.fuelFilter = document.querySelector(".toolbar select:nth-of-type(2)");

        this.vehiclesList = [];

        this.init();
    }

    async init() {
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html");
            return;
        }

        this.bindEvents();
        await this.loadVehicles();
    }

    bindEvents() {
        this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
        this.btnCancel.addEventListener("click", this.resetForm.bind(this));
        
        if (this.searchInput) this.searchInput.addEventListener("input", this.filterAndRender.bind(this));
        if (this.statusFilter) this.statusFilter.addEventListener("change", this.filterAndRender.bind(this));
        if (this.fuelFilter) this.fuelFilter.addEventListener("change", this.filterAndRender.bind(this));
    }


    async loadVehicles() {
        try {
            const { data, error } = await window.supabaseClient
                .from("vehicles")
                .select("*")
                .order("id", { ascending: false });

            if (error) throw error;

            this.vehiclesList = data || [];
            this.filterAndRender();
        } catch (error) {
            console.error("Failed to load vehicles:", error);
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--brand-danger);">Failed to retrieve data from database.</td></tr>';
        }
    }


    async validateForm() {
        let isValid = true;
        
        const toggleError = (fieldId, show, message) => {
            const el = document.getElementById(`err-${fieldId}`);
            if (el) {
                if (message) el.innerText = message;
                el.style.display = show ? "block" : "none";
            }
            if (show) isValid = false;
        };

        ["registration", "year", "mileage", "vin"].forEach(id => toggleError(id, false));

        const plateValue = this.licensePlateInput.value.trim().toUpperCase();
        if (!plateValue) toggleError("registration", true);

        const yearValue = parseInt(this.yearInput.value, 10);
        if (isNaN(yearValue) || yearValue < 1990 || yearValue > 2026) toggleError("year", true);

        const mileageValue = parseInt(this.mileageInput.value, 10);
        if (isNaN(mileageValue) || mileageValue < 0) toggleError("mileage", true);

        const vinValue = this.vinInput.value.trim();
        if (vinValue && vinValue.length < 10) toggleError("vin", true);

        if (isValid) {
            const currentId = this.idInput.value;
            let query = window.supabaseClient.from("vehicles").select("id").eq("license_plate", plateValue);
            if (currentId) query = query.neq("id", currentId);
            
            const { data, error } = await query;
            if (!error && data && data.length > 0) {
                toggleError("registration", true, "This registration number already exists.");
            }
        }

        return isValid;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!(await this.validateForm())) return;

        const payload = {
            license_plate: this.licensePlateInput.value.trim().toUpperCase(),
            make: this.makeInput.value.trim() || null,
            model: this.modelInput.value.trim() || null,
            manufacture_year: parseInt(this.yearInput.value, 10) || null,
            mileage: parseInt(this.mileageInput.value, 10) || 0,
            vin: this.vinInput.value.trim().toUpperCase() || null,
            fuel_type: this.fuelTypeInput.value || null,
            status: this.statusInput.value || "Activ",
            color: this.colorInput.value.trim() || null
        };

        const id = this.idInput.value;

        try {
            if (id) {
                const { error } = await window.supabaseClient.from("vehicles").update(payload).eq("id", id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from("vehicles").insert([payload]);
                if (error) throw error;
            }
            
            this.resetForm();
            await this.loadVehicles();
        } catch (error) {
            alert("Database Error: Could not save the vehicle record.");
            console.error("SUPABASE ERROR:", error);
        }
    }

   
    getStatusBadgeHTML(status) {
        let badgeClass = "badge-archived";
        if (status === "Activ") badgeClass = "badge-success";
        if (status === "În service") badgeClass = "badge-warning";
        if (status === "Indisponibil") badgeClass = "badge-danger";

        return `<span class="badge ${badgeClass}">${this.escapeHtml(status)}</span>`;
    }

    filterAndRender() {
        this.tableBody.innerHTML = "";

        const query = this.searchInput ? this.searchInput.value.toLowerCase().trim() : "";
        const targetStatus = this.statusFilter ? this.statusFilter.value : "";
        const targetFuel = this.fuelFilter ? this.fuelFilter.value : "";

        const filtered = this.vehiclesList.filter(vehicle => {
            const matchesSearch = 
                (vehicle.license_plate && vehicle.license_plate.toLowerCase().includes(query)) ||
                (vehicle.make && vehicle.make.toLowerCase().includes(query)) ||
                (vehicle.model && vehicle.model.toLowerCase().includes(query));

            const matchesStatus = !targetStatus || vehicle.status === targetStatus;
            const matchesFuel = !targetFuel || vehicle.fuel_type === targetFuel;

            return matchesSearch && matchesStatus && matchesFuel;
        });

        if (filtered.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No vehicles found matching criteria.</td></tr>';
            return;
        }

        filtered.forEach(record => {
            const tr = document.createElement("tr");
            const statusBadge = this.getStatusBadgeHTML(record.status);
            const formattedMileage = record.mileage ? `${record.mileage.toLocaleString()} km` : '0 km';

            tr.innerHTML = `
                <td><strong>${this.escapeHtml(record.license_plate)}</strong></td>
                <td>${this.escapeHtml(record.make || '-')}</td>
                <td>${this.escapeHtml(record.model || '-')}</td>
                <td>${record.manufacture_year || '-'}</td>
                <td>${formattedMileage}</td>
                <td>${this.escapeHtml(record.fuel_type || '-')}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="vehiclesCtrl.editRecord('${record.id}')" aria-label="Edit Vehicle">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="vehiclesCtrl.deleteRecord('${record.id}')" aria-label="Delete Vehicle">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    editRecord(id) {
        const record = this.vehiclesList.find(r => r.id == id);
        if (!record) return;

        this.formTitle.textContent = "Edit Vehicle Record";
        this.idInput.value = record.id;
        this.licensePlateInput.value = record.license_plate;
        this.makeInput.value = record.make || "";
        this.modelInput.value = record.model || "";
        this.yearInput.value = record.manufacture_year || "";
        this.mileageInput.value = record.mileage || "0";
        this.vinInput.value = record.vin || "";
        this.fuelTypeInput.value = record.fuel_type || "";
        this.statusInput.value = record.status || "Activ";
        this.colorInput.value = record.color || "";
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async deleteRecord(id) {
        if (!confirm("Sigur doriți să ștergeți vehiculul?")) return;

        try {
            const { error } = await window.supabaseClient.from("vehicles").delete().eq("id", id);
            if (error) throw error;
            await this.loadVehicles();
        } catch (error) {
            alert("Database Error: Failed to delete the vehicle record.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    resetForm() {
        this.form.reset();
        this.idInput.value = "";
        this.formTitle.textContent = "Add New Vehicle";
        
        ["registration", "year", "mileage", "vin"].forEach(id => {
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

let vehiclesCtrl;
document.addEventListener("DOMContentLoaded", () => {
    vehiclesCtrl = new VehiclesController();
});