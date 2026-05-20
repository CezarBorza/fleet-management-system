"use strict";


class MaintenanceController {
    constructor() {
        this.form = document.getElementById("maintenance-form");
        this.formTitle = document.getElementById("form-title");
        this.idInput = document.getElementById("maintenance-id");
        this.vehicleInput = document.getElementById("vehicle-id");
        this.typeInput = document.getElementById("service-type");
        this.dateInput = document.getElementById("service-date");
        this.costInput = document.getElementById("cost");
        this.mileageInput = document.getElementById("mileage");
        this.notesInput = document.getElementById("notes");
        
        this.btnCancel = document.getElementById("btn-cancel");
        
        this.tableBody = document.getElementById("maintenance-table-body");

        this.typeSearch = document.getElementById("search-type"); 
        this.minCostSearch = document.getElementById("search-min-cost");
        this.maxCostSearch = document.getElementById("search-max-cost");

        this.vehiclesMap = {};
        this.maintenanceList = [];

        this.init();
    }

    async init() {
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html");
            return;
        }

        this.bindEvents();
        await this.loadVehicles();
        await this.loadMaintenanceRecords();
    }

    bindEvents() {
        this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
        this.btnCancel.addEventListener("click", this.resetForm.bind(this));

        [this.typeSearch, this.minCostSearch, this.maxCostSearch].forEach(el => {
            if (el) el.addEventListener("input", this.renderTable.bind(this));
        });
    }

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

    async loadMaintenanceRecords() {
        try {
            this.maintenanceList = await DatabaseEngine.getMaintenanceRecords();
            this.renderTable();
        } catch (error) {
            console.error("Failed to load maintenance records:", error);
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

        ['vehicle', 'type', 'date', 'cost', 'mileage'].forEach(id => toggleError(id, false));

        if (!this.vehicleInput.value) toggleError('vehicle', true);
        if (!this.typeInput.value) toggleError('type', true);
        if (!this.dateInput.value) toggleError('date', true);

        const costValue = parseFloat(this.costInput.value);
        if (isNaN(costValue) || costValue <= 0) toggleError('cost', true);

        const mileageValue = parseInt(this.mileageInput.value, 10);
        if (!this.mileageInput.value.trim()) {
            toggleError('mileage', true, "Mileage is a mandatory field.");
        } else if (isNaN(mileageValue) || mileageValue < 0) {
            toggleError('mileage', true, "Mileage metrics must represent a positive integer.");
        }

        return isValid;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) return;

        const payload = {
            vehicle_id: parseInt(this.vehicleInput.value, 10),
            service_type: this.typeInput.value,
            service_date: this.dateInput.value,
            cost: parseFloat(this.costInput.value),
            mileage: this.mileageInput.value ? parseInt(this.mileageInput.value, 10) : null,
            notes: this.notesInput.value.trim() || null
        };

        const id = this.idInput.value;

        try {
            if (id) {
                await DatabaseEngine.updateMaintenanceRecord(id, payload);
            } else {
                await DatabaseEngine.addMaintenanceRecord(payload);
            }
            
            this.resetForm();
            await this.loadMaintenanceRecords();
        } catch (error) {
            alert("Database Error: Could not save the maintenance record.");
            console.error("SUPABASE ERROR:", error);
        }
    }


    calculateStatusHTML(serviceType, serviceDateStr) {
        const serviceDate = new Date(serviceDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = today - serviceDate;
        const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (serviceType === "ITP") {
            if (daysElapsed >= 365) {
                return `<span class="badge badge-danger">ITP Expired</span>`;
            } else if (daysElapsed >= 335) { 
                return `<span class="badge badge-warning">ITP Due</span>`;
            }
        } else if (serviceType === "Revision" || serviceType === "Oil Change") {
            if (daysElapsed >= 334) { 
                return `<span class="badge badge-warning">Revision Due</span>`;
            }
        }

        return `<span class="badge badge-success">Completed</span>`;
    }

    renderTable() {
        this.tableBody.innerHTML = "";

        const typeQuery = this.typeSearch ? this.typeSearch.value : ""; // Matches dropdown value
        const minCost = this.minCostSearch ? parseFloat(this.minCostSearch.value) : 0;
        const maxCost = this.maxCostSearch ? parseFloat(this.maxCostSearch.value) : Infinity;

        const filtered = this.maintenanceList.filter(record => {
            const matchesType = !typeQuery || record.service_type === typeQuery;
            const matchesMin = isNaN(minCost) || record.cost >= minCost;
            const matchesMax = isNaN(maxCost) || record.cost <= maxCost;
            
            return matchesType && matchesMin && matchesMax;
        });

        if (filtered.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No matching service records found.</td></tr>';
            return;
        }

        filtered.forEach(record => {
            const tr = document.createElement("tr");
            const vehiclePlate = this.vehiclesMap[record.vehicle_id] || `ID: ${record.vehicle_id}`;
            const statusBadge = this.calculateStatusHTML(record.service_type, record.service_date);
            const formattedMileage = record.mileage ? `${record.mileage.toLocaleString()} km` : '-';
            const notesDisplay = record.notes ? record.notes : '-';

            tr.innerHTML = `
                <td><strong>${vehiclePlate}</strong></td>
                <td>${record.service_type}</td>
                <td>${record.service_date}</td>
                <td>€${parseFloat(record.cost).toFixed(2)}</td>
                <td>${formattedMileage}</td>
                <td class="notes-column" title="${notesDisplay}">${notesDisplay}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="maintenanceCtrl.editRecord('${record.id}')" aria-label="Edit Record">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="maintenanceCtrl.deleteRecord('${record.id}')" aria-label="Delete Record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    editRecord(id) {
        const record = this.maintenanceList.find(r => r.id == id);
        if (!record) return;

        this.formTitle.textContent = "Edit Service Record";
        this.idInput.value = record.id;
        this.vehicleInput.value = record.vehicle_id;
        this.typeInput.value = record.service_type;
        this.dateInput.value = record.service_date;
        this.costInput.value = record.cost;
        this.mileageInput.value = record.mileage || "";
        this.notesInput.value = record.notes || "";
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async deleteRecord(id) {
        if (!confirm("Are you sure you want to permanently delete this service record?")) return;

        try {
            await DatabaseEngine.deleteMaintenanceRecord(id);
            await this.loadMaintenanceRecords();
        } catch (error) {
            alert("Database Error: Failed to delete the record.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    resetForm() {
        this.form.reset();
        this.idInput.value = "";
        this.formTitle.textContent = "Log New Service Entry";
        
        ['vehicle', 'type', 'date', 'cost'].forEach(id => {
            const el = document.getElementById(`err-${id}`);
            if (el) el.style.display = "none";
        });
    }
}

let maintenanceCtrl;
document.addEventListener("DOMContentLoaded", () => {
    maintenanceCtrl = new MaintenanceController();
});