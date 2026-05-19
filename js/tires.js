"use strict";


class TiresController {
    constructor() {
        this.form = document.getElementById("tire-form");
        this.formTitle = document.getElementById("form-title");
        this.idInput = document.getElementById("tire-id");
        this.vehicleInput = document.getElementById("vehicle-id");
        this.typeInput = document.getElementById("tire-type");
        this.brandInput = document.getElementById("brand");
        this.sizeInput = document.getElementById("size");
        this.mountDateInput = document.getElementById("mount-date");
        this.replacementDateInput = document.getElementById("replacement-date");
        
        this.btnCancel = document.getElementById("btn-cancel");
        
        this.tableBody = document.getElementById("tires-table-body");

        this.vehiclesMap = {};
        this.tiresList = [];

        this.init();
    }

    async init() {
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html");
            return;
        }

        this.bindEvents();
        await this.loadVehiclesLookup();
        await this.loadTireRecords();
    }

    bindEvents() {
    if (this.form) {
        this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
    } else {
        console.warn("Warning: Element id='tire-form' was not found on this page.");
    }

    if (this.btnCancel) {
        this.btnCancel.addEventListener("click", this.resetForm.bind(this));
    } else {
        console.warn("Warning: Element id='btn-cancel' was not found on this page.");
    }
}

    async loadVehiclesLookup() {
        try {
            const { data: vehicles, error } = await window.supabaseClient
                .from("vehicles")
                .select("id, license_plate");

            if (error) throw error;

            this.vehicleInput.innerHTML = '<option value="" disabled selected>Select a vehicle...</option>';
            
            vehicles.forEach(vehicle => {
                this.vehiclesMap[vehicle.id] = vehicle.license_plate;
                
                const option = document.createElement("option");
                option.value = vehicle.id;
                option.textContent = vehicle.license_plate;
                this.vehicleInput.appendChild(option);
            });
        } catch (error) {
            console.error("Failed to load vehicle reference dropdown maps:", error);
        }
    }


    async loadTireRecords() {
        try {
            const { data, error } = await window.supabaseClient
                .from("tires")
                .select("*")
                .order("id", { ascending: false });

            if (error) throw error;

            this.tiresList = data || [];
            this.renderTable();
        } catch (error) {
            console.error("Failed to load tire records pipeline logs:", error);
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

        ["vehicle", "type", "size"].forEach(id => toggleError(id, false));

        if (!this.vehicleInput.value) toggleError("vehicle", true);
        if (!this.typeInput.value) toggleError("type", true);
        if (!this.sizeInput.value.trim()) toggleError("size", true);

        return isValid;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) return;

        const payload = {
            vehicle_id: parseInt(this.vehicleInput.value, 10),
            tire_type: this.typeInput.value,
            brand: this.brandInput.value.trim() || null,
            size: this.sizeInput.value.trim().toUpperCase(),
            mount_date: this.mountDateInput.value || null,
            replacement_date: this.replacementDateInput.value || null
        };

        const id = this.idInput.value;

        try {
            if (id) {
                const { error } = await window.supabaseClient.from("tires").update(payload).eq("id", id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from("tires").insert([payload]);
                if (error) throw error;
            }
            
            this.resetForm();
            await this.loadTireRecords();
        } catch (error) {
            alert("Database Error: Could not save the tire logs record.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    calculateTypeBadgeHTML(type) {
        let badgeClass = "badge-archived";
        if (type === "Activ" || type === "Vară" || type === "Summer") badgeClass = "badge-success";
        if (type === "În service" || type === "Iarnă" || type === "Winter") badgeClass = "badge-danger";
        if (type === "All Season") badgeClass = "badge-warning";

        return `<span class="badge ${badgeClass}">${this.escapeHtml(type)}</span>`;
    }

    renderTable() {
        this.tableBody.innerHTML = "";

        if (this.tiresList.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No tire records discovered.</td></tr>';
            return;
        }

        this.tiresList.forEach(record => {
            const tr = document.createElement("tr");
            
            const vehiclePlate = this.vehiclesMap[record.vehicle_id] || `ID: ${record.vehicle_id}`;
            const typeBadge = this.calculateTypeBadgeHTML(record.tire_type);

            tr.innerHTML = `
                <td><strong>${this.escapeHtml(vehiclePlate)}</strong></td>
                <td>${typeBadge}</td>
                <td>${this.escapeHtml(record.brand || '-')}</td>
                <td><strong>${this.escapeHtml(record.size)}</strong></td>
                <td>${record.mount_date || '-'}</td>
                <td>${record.replacement_date || '-'}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="tiresCtrl.editRecord('${record.id}')" aria-label="Edit Tires Log">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="tiresCtrl.deleteRecord('${record.id}')" aria-label="Delete Tires Log">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    editRecord(id) {
        const record = this.tiresList.find(r => r.id == id);
        if (!record) return;

        this.formTitle.textContent = "Edit Tire Record";
        this.idInput.value = record.id;
        this.vehicleInput.value = record.vehicle_id;
        this.typeInput.value = record.tire_type;
        this.brandInput.value = record.brand || "";
        this.sizeInput.value = record.size;
        this.mountDateInput.value = record.mount_date || "";
        this.replacementDateInput.value = record.replacement_date || "";
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async deleteRecord(id) {
        if (!confirm("Sigur doriți să ștergeți această înregistrare de anvelope?")) return;

        try {
            const { error } = await window.supabaseClient.from("tires").delete().eq("id", id);
            if (error) throw error;
            await this.loadTireRecords();
        } catch (error) {
            alert("Database Error: Failed to drop tire record row allocation.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    resetForm() {
        this.form.reset();
        this.idInput.value = "";
        this.formTitle.textContent = "Log New Tire Setup Allocation";
        
        ["vehicle", "type", "size"].forEach(id => {
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

let tiresCtrl;
document.addEventListener("DOMContentLoaded", () => {
    tiresCtrl = new TiresController();
});