"use strict";


class VignetteController {
    constructor() {
        this.form = document.getElementById("vignette-form");
        this.formTitle = document.getElementById("form-title");
        this.idInput = document.getElementById("vignette-id");
        this.vehicleInput = document.getElementById("vehicle-id");
        this.countryInput = document.getElementById("country");
        this.purchaseInput = document.getElementById("purchase-date");
        this.expiryInput = document.getElementById("expiry-date");
        this.costInput = document.getElementById("cost");
        this.btnCancel = document.getElementById("btn-cancel");
        
        this.tableBody = document.getElementById("vignettes-table-body");

        this.registrationSearch = document.getElementById("search-registration");
        this.countrySearch = document.getElementById("search-country");
        this.minCostSearch = document.getElementById("search-min-cost");
        this.maxCostSearch = document.getElementById("search-max-cost");

        this.vehiclesMap = {}; 
        this.vignettesList = [];

        this.init();
    }

    async init() {
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html");
            return;
        }

        this.bindEvents();
        await this.loadVehicles();
        await this.loadVignettes();
    }

    bindEvents() {
        this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
        this.btnCancel.addEventListener("click", this.resetForm.bind(this));

        [this.countrySearch, this.minCostSearch, this.maxCostSearch, this.registrationSearch].forEach(el => {
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
            console.error("Failed to load vehicles:", error);
        }
    }

    async loadVignettes() {
        try {
            this.vignettesList = await DatabaseEngine.getVignettes();
            this.renderTable();
        } catch (error) {
            console.error("Failed to load vignettes:", error);
            this.tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        }
    }

    validateForm() {
        let isValid = true;
        
        const toggleError = (fieldId, show) => {
            document.getElementById(`err-${fieldId}`).style.display = show ? "block" : "none";
            if(show) isValid = false;
        };

        ['vehicle', 'country', 'purchase', 'expiry', 'cost'].forEach(id => toggleError(id, false));

        if (!this.vehicleInput.value) toggleError('vehicle', true);
        if (!this.countryInput.value.trim()) toggleError('country', true);
        if (!this.purchaseInput.value) toggleError('purchase', true);

        const costValue = parseFloat(this.costInput.value);
        if (isNaN(costValue) || costValue <= 0) toggleError('cost', true);

        if (!this.expiryInput.value) {
            toggleError('expiry', true);
        } else {
            const purchaseDate = new Date(this.purchaseInput.value);
            const expiryDate = new Date(this.expiryInput.value);
            
            if (expiryDate <= purchaseDate) {
                toggleError('expiry', true);
            }
        }

        return isValid;
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) return;

        const payload = {
            vehicle_id: parseInt(this.vehicleInput.value, 10),
            country: this.countryInput.value.trim(),
            purchase_date: this.purchaseInput.value,
            expiration_date: this.expiryInput.value, 
            cost: parseFloat(this.costInput.value)
        };

        const id = this.idInput.value;

        try {
            if (id) {
                await DatabaseEngine.updateVignette(id, payload);
            } else {
                await DatabaseEngine.addVignette(payload);
            }
            
            this.resetForm();
            await this.loadVignettes();
        } catch (error) {
            alert("An error occurred while saving the vignette.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    calculateStatusHTML(expiryDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const expiryDate = new Date(expiryDateStr);
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `<span class="badge badge-danger">Expired</span>`;
        } else if (diffDays <= 7) {
            return `<span class="badge badge-warning">Expiring Soon (${diffDays}d)</span>`;
        } else {
            return `<span class="badge badge-success">Active</span>`;
        }
    }

    renderTable() {
        this.tableBody.innerHTML = "";

        const registrationQuery = this.registrationSearch ? this.registrationSearch.value.toLowerCase().trim() : "";
        const countryQuery = this.countrySearch ? this.countrySearch.value.toLowerCase().trim() : "";
        const minCost = this.minCostSearch ? parseFloat(this.minCostSearch.value) : 0;
        const maxCost = this.maxCostSearch ? parseFloat(this.maxCostSearch.value) : Infinity;

        const filtered = this.vignettesList.filter(vign => {
            const matchesRegistration = (this.vehiclesMap[vign.vehicle_id] || "").toLowerCase().includes(registrationQuery);
            const matchesCountry = (vign.country || "").toLowerCase().includes(countryQuery);
            const matchesMin = isNaN(minCost) || vign.cost >= minCost;
            const matchesMax = isNaN(maxCost) || vign.cost <= maxCost;

            return matchesRegistration && matchesCountry && matchesMin && matchesMax;
        });

        if (filtered.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No vignettes match your search.</td></tr>';
            return;
        }

        filtered.forEach(vign => {
            const tr = document.createElement("tr");
            const vehiclePlate = this.vehiclesMap[vign.vehicle_id] || `ID: ${vign.vehicle_id}`;
            const statusBadge = this.calculateStatusHTML(vign.expiration_date); 

            tr.innerHTML = `
                <td><strong>${vehiclePlate}</strong></td>
                <td>${vign.country}</td>
                <td>${vign.purchase_date}</td>
                <td>${vign.expiration_date}</td> 
                <td>€${parseFloat(vign.cost).toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="vignetteCtrl.editRecord('${vign.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn btn-delete" onclick="vignetteCtrl.deleteRecord('${vign.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    editRecord(id) {
        const vign = this.vignettesList.find(v => v.id == id);
        if (!vign) return;

        this.formTitle.textContent = "Edit Vignette";
        this.idInput.value = vign.id;
        this.vehicleInput.value = vign.vehicle_id;
        this.countryInput.value = vign.country;
        this.purchaseInput.value = vign.purchase_date;
        this.expiryInput.value = vign.expiration_date; 
        this.costInput.value = vign.cost;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async deleteRecord(id) {
        if (!confirm("Are you sure you want to delete this vignette? This action cannot be undone.")) return;

        try {
            await DatabaseEngine.deleteVignette(id);
            await this.loadVignettes();
        } catch (error) {
            alert("Failed to delete record.");
            console.error("SUPABASE ERROR:", error);
        }
    }

    resetForm() {
        this.form.reset();
        this.idInput.value = "";
        this.formTitle.textContent = "Add New Vignette";
        ['vehicle', 'country', 'purchase', 'expiry', 'cost'].forEach(id => {
            document.getElementById(`err-${id}`).style.display = "none";
        });
    }
}

let vignetteCtrl;
document.addEventListener("DOMContentLoaded", () => {
    vignetteCtrl = new VignetteController();
});