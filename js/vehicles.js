let vehiclesState = [];
let editingVehicleId = null;

const vehicleForm = document.getElementById('vehicle-form');
const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const vehiclesTableBody = document.getElementById('vehicles-table-body');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');

// Initialize view on load
document.addEventListener('DOMContentLoaded', () => {
    fetchVehicles();
    setupEventListeners();
});

/**
 * Setup Event Listeners for Forms, Search, and Filters
 */
function setupEventListeners() {
    // Form submission (Add / Edit)
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', handleFormSubmit);
    }

    // Cancel edit state
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetForm);
    }

    // Real-time search implementation
    if (searchInput) {
        searchInput.addEventListener('input', filterAndRenderVehicles);
    }

    // Status filter dropdown implementation
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAndRenderVehicles);
    }
}

async function fetchVehicles() {
    try {
        const { data, error } = await window.supabaseClient
            .from('vehicles')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        console.log("RAW DATA RECEIVED FROM SUPABASE:", data);

        vehiclesState = data || [];
        filterAndRenderVehicles();
    } catch (error) {
        console.error("Error fetching vehicles:", error.message);
        alert("Eroare la încărcarea vehiculelor: " + error.message);
    }
}


function filterAndRenderVehicles() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';

    const filtered = vehiclesState.filter(vehicle => {
        const matchesSearch = 
            vehicle.license_plate.toLowerCase().includes(query) ||
            vehicle.make.toLowerCase().includes(query) ||
            vehicle.model.toLowerCase().includes(query);

        const matchesStatus = selectedStatus === '' || vehicle.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    renderVehiclesTable(filtered);
}

function renderVehiclesTable(data) {
    if (!vehiclesTableBody) return;
    vehiclesTableBody.innerHTML = '';

    if (data.length === 0) {
        vehiclesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Nu s-au găsit vehicule.</td></tr>`;
        return;
    }

    data.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(vehicle.license_plate)}</strong></td>
            <td>${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</td>
            <td>${vehicle.manufacture_year || '-'}</td>
            <td>${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '0 km'}</td>
            <td><span class="status-badge status-${vehicle.status.toLowerCase().replace(' ', '-')}">${escapeHtml(vehicle.status)}</span></td>
            <td>${escapeHtml(vehicle.color || '-')}</td>
            <td>
                <div class="actions-wrapper">
                    <button class="btn-action btn-view" onclick="viewVehicleDetails(${vehicle.id})">Details</button>
                    <button class="btn-action btn-edit" onclick="prepareEditVehicle(${vehicle.id})">Edit</button>
                    <button class="btn-action btn-delete" onclick="deleteVehicle(${vehicle.id})">Delete</button>
                </div>
            </td>
        `;
        vehiclesTableBody.appendChild(row);
    });
}

async function validateVehicle(formData) {
    // 1. Mandatory check fields cannot be empty
    if (!formData.license_plate.trim()) return "Numărul de înmatriculare este obligatoriu.";
    if (!formData.make.trim()) return "Marca vehiculului este obligatorie.";
    if (!formData.model.trim()) return "Modelul vehiculului este obligatoriu.";

    const year = parseInt(formData.manufacture_year);
    if (isNaN(year) || year < 1990 || year > 2026) {
        return "Anul de fabricație trebuie să fie între 1990 și 2026.";
    }

    const mileage = parseInt(formData.mileage);
    if (isNaN(mileage) || mileage < 0) {
        return "Kilometrajul trebuie să fie un număr pozitiv.";
    }

    if (formData.vin && formData.vin.trim().length < 10) {
        return "Codul VIN trebuie să conțină minim 10 caractere.";
    }

    const isUnique = await checkLicensePlateUniqueness(formData.license_plate, editingVehicleId);
    if (!isUnique) {
        return "Numărul de înmatriculare există deja în sistem.";
    }

    return null; 
}

async function checkLicensePlateUniqueness(plate, currentId) {
    let query = window.supabaseClient
        .from('vehicles')
        .select('id')
        .eq('license_plate', plate.trim().toUpperCase());
    
    if (currentId) {
        query = query.neq('id', currentId);
    }
    
    const { data, error } = await query;
    if (error) return false;
    return data.length === 0;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    // Compile form input data structures
    const formData = {
        license_plate: document.getElementById('input-license-plate').value.trim().toUpperCase(),
        make: document.getElementById('input-make').value.trim(),
        model: document.getElementById('input-model').value.trim(),
        manufacture_year: parseInt(document.getElementById('input-year').value),
        mileage: parseInt(document.getElementById('input-mileage').value) || 0,
        vin: document.getElementById('input-vin').value.trim().toUpperCase(),
        fuel_type: document.getElementById('input-fuel-type').value,
        status: document.getElementById('input-status').value || 'Active',
        color: document.getElementById('input-color').value.trim()
    };

    // Evaluate business rules constraints validation
    const validationError = await validateVehicle(formData);
    if (validationError) {
        alert(validationError);
        return;
    }

    try {
        if (editingVehicleId) {
            // Process UPDATE query action execution
            const { error } = await window.supabaseClient
                .from('vehicles')
                .update(formData)
                .eq('id', editingVehicleId);

            if (error) throw error;
            alert("Vehiculul a fost modificat cu succes!");
        } else {
            // Process INSERT query action execution
            const { error } = await window.supabaseClient
                .from('vehicles')
                .insert([formData]);

            if (error) throw error;
            alert("Vehiculul a fost adăugat cu succes!");
        }

        resetForm();
        fetchVehicles();
    } catch (error) {
        console.error("Database CRUD Error:", error.message);
        alert("Eroare la salvarea datelor: " + error.message);
    }
}

/**
 * Setup data mapping into form fields for processing updates
 */
function prepareEditVehicle(id) {
    const vehicle = vehiclesState.find(v => v.id === id);
    if (!vehicle) return;

    editingVehicleId = id;
    if (formTitle) formTitle.innerText = "Editare Vehicul";
    if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";

    // Inject parameters safely into structural view elements
    document.getElementById('input-license-plate').value = vehicle.license_plate;
    document.getElementById('input-make').value = vehicle.make;
    document.getElementById('input-model').value = vehicle.model;
    document.getElementById('input-year').value = vehicle.manufacture_year;
    document.getElementById('input-mileage').value = vehicle.mileage;
    document.getElementById('input-vin').value = vehicle.vin || '';
    document.getElementById('input-fuel-type').value = vehicle.fuel_type || '';
    document.getElementById('input-status').value = vehicle.status;
    document.getElementById('input-color').value = vehicle.color || '';


    window.scrollTo({ top: 0, behavior: 'smooth' });
}


async function deleteVehicle(id) {
    // Strict requirement validation prompt confirmation match pattern
    const confirmation = confirm("Sigur doriți să ștergeți vehiculul?");
    if (!confirmation) return;

    try {
        const { error } = await window.supabaseClient
            .from('vehicles')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert("Vehiculul a fost șters din bază.");
        if (editingVehicleId === id) resetForm();
        fetchVehicles();
    } catch (error) {
        console.error("Deletion query error encountered:", error.message);
        alert("Eroare la ștergerea vehiculului: " + error.message);
    }
}


function viewVehicleDetails(id) {
    const vehicle = vehiclesState.find(v => v.id === id);
    if (!vehicle) return;

    const summaryDetails = `
        DETALII VEHICUL:
        ------------------------------------------
        Număr Înmatriculare: ${vehicle.license_plate}
        Marcă / Model: ${vehicle.make} ${vehicle.model}
        An Fabricație: ${vehicle.manufacture_year || '-'}
        Kilometraj: ${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '0 km'}
        Cod VIN: ${vehicle.vin || '-'}
        Tip Combustibil: ${vehicle.fuel_type || '-'}
        Culoare: ${vehicle.color || '-'}
        Status Curent: ${vehicle.status}
    `;
    alert(summaryDetails);
}


function resetForm() {
    editingVehicleId = null;
    if (vehicleForm) vehicleForm.reset();
    if (formTitle) formTitle.innerText = "Adăugare Vehicul";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
}


function escapeHtml(string) {
    if (!string) return '';
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}