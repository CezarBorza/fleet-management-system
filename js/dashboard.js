"use strict";

/**
 * Dashboard Controller
 * Aggregates data from multiple Database tables to render metrics
 * and generate critical alerts without complex mapping dependencies.
 */
class DashboardController {
    constructor() {
        this.checkAuthentication();

        // 1. Label Elements
        this.lblVehicles = document.getElementById("lbl-total-vehicles");
        this.lblInsurances = document.getElementById("lbl-total-insurances");
        this.lblService = document.getElementById("lbl-total-service");

        // 2. Container Elements
        this.fleetTableBody = document.getElementById("fleet-table-body");
        this.alertsContainer = document.getElementById("alerts-container");

        // 3. Application State
        this.vehicles = [];
        this.insurances = [];
        this.maintenance = [];

        this.init();
    }

    checkAuthentication() {
        if (sessionStorage.getItem("is_authenticated") !== "true") {
            window.location.replace("index.html"); 
        }
    }

    async init() {
        await this.loadAggregatedData();
        this.calculateMetrics();
        this.renderFleetTable();
        this.renderAlertsEngine();
    }

    /**
     * Executes parallel asynchronous requests.
     */
    async loadAggregatedData() {
        try {
            const [vData, iData, mData] = await Promise.all([
                DatabaseEngine.getVehicles().catch(() => []),
                DatabaseEngine.getInsurances ? DatabaseEngine.getInsurances().catch(() => []) : Promise.resolve([]),
                DatabaseEngine.getMaintenanceRecords ? DatabaseEngine.getMaintenanceRecords().catch(() => []) : Promise.resolve([])
            ]);

            this.vehicles = vData || [];
            this.insurances = iData || [];
            this.maintenance = mData || [];

        } catch (error) {
            console.error("Critical Aggregation Error:", error);
        }
    }

    calculateMetrics() {
        if (this.lblVehicles) {
            this.lblVehicles.textContent = this.vehicles.length;
        }

        if (this.lblService) {
            const inService = this.vehicles.filter(v => v.status === 'În service' || v.status === 'In Service').length;
            this.lblService.textContent = inService;
        }

        if (this.lblInsurances) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const expiredInsurances = this.insurances.filter(ins => {
                const expDate = new Date(ins.expiration_date);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                return diffDays <= 30; // Captures both expired (< 0) and expiring soon
            }).length;
            
            this.lblInsurances.textContent = expiredInsurances;
        }
    }

    /**
     * Renders the simplified Fleet Table.
     */
    renderFleetTable() {
        if (!this.fleetTableBody) return;
        this.fleetTableBody.innerHTML = "";

        if (this.vehicles.length === 0) {
            this.fleetTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No vehicles registered.</td></tr>`;
            return;
        }

        const getStatusClass = (status) => {
            const s = (status || '').toLowerCase();
            if(s.includes('activ') || s.includes('active')) return 'status-activ';
            if(s.includes('service')) return 'status-service';
            if(s.includes('indisponibil') || s.includes('unavailable')) return 'status-indisponibil';
            return 'status-arhivat'; 
        };

        this.vehicles.forEach(vehicle => {
            const plate = vehicle.license_plate || `Unknown`;
            const modelStr = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Unknown Model';
            const vStatus = vehicle.status || 'Active';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${this.escapeHtml(plate)}</strong></td>
                <td>${this.escapeHtml(modelStr)}</td>
                <td>
                    <span class="status-dot ${getStatusClass(vStatus)}"></span>
                    ${this.escapeHtml(vStatus)}
                </td>
            `;
            this.fleetTableBody.appendChild(tr);
        });
    }

    renderAlertsEngine() {
        if (!this.alertsContainer) return;
        
        let alertsArray = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Memory lookup helper using correct SQL column
        const getPlate = (vid) => {
            const v = this.vehicles.find(v => v.id === vid);
            return v ? v.license_plate : `Unknown Plate`;
        };

        // 1. Process Insurances
        this.insurances.forEach(ins => {
            const expDate = new Date(ins.expiration_date);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            const plate = getPlate(ins.vehicle_id);

            if (diffDays < 0) {
                alertsArray.push({
                    severity: 'high',
                    icon: 'fa-triangle-exclamation',
                    title: `${this.escapeHtml(ins.insurance_type)} Policy Expired`,
                    message: `The ${this.escapeHtml(ins.insurance_type)} for ${this.escapeHtml(plate)} expired ${Math.abs(diffDays)} days ago.`
                });
            } else if (diffDays <= 30) {
                alertsArray.push({
                    severity: 'medium',
                    icon: 'fa-clock',
                    title: `${this.escapeHtml(ins.insurance_type)} Expiring Soon`,
                    message: `Policy for ${this.escapeHtml(plate)} expires in ${diffDays} days.`
                });
            }
        });

        // 2. Process Maintenance (ITP context)
        this.maintenance.forEach(log => {
            if (log.service_type === 'ITP') {
                const srvDate = new Date(log.service_date);
                const diffDays = Math.floor((today - srvDate) / (1000 * 60 * 60 * 24));
                const plate = getPlate(log.vehicle_id);

                if (diffDays >= 365) {
                    alertsArray.push({
                        severity: 'high',
                        icon: 'fa-ban',
                        title: `ITP Expired`,
                        message: `The Technical Inspection for ${this.escapeHtml(plate)} is severely overdue.`
                    });
                } else if (diffDays >= 335) {
                    alertsArray.push({
                        severity: 'medium',
                        icon: 'fa-screwdriver-wrench',
                        title: `ITP Due Soon`,
                        message: `The ITP for ${this.escapeHtml(plate)} requires renewal within 30 days.`
                    });
                }
            }
        });

        // 3. Render Output
        this.alertsContainer.innerHTML = "";
        
        if (alertsArray.length === 0) {
            this.alertsContainer.innerHTML = `<p class="text-muted" style="text-align: center; margin-top: 2rem;">System stable. No urgent notifications.</p>`;
            return;
        }

        // Sort descending by severity (High first)
        alertsArray.sort((a, b) => (a.severity === 'high' ? -1 : 1));

        alertsArray.forEach(alert => {
            const div = document.createElement("div");
            div.className = `alert-item severity-${alert.severity}`;
            div.innerHTML = `
                <div class="alert-icon">
                    <i class="fa-solid ${alert.icon}"></i>
                </div>
                <div class="alert-content">
                    <h4>${alert.title}</h4>
                    <p>${alert.message}</p>
                </div>
            `;
            this.alertsContainer.appendChild(div);
        });
    }

    /**
     * Security helper to prevent XSS rendering injections
     */
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

document.addEventListener("DOMContentLoaded", () => {
    new DashboardController();
});