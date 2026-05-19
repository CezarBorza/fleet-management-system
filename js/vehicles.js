
let vehiclesState = [];
let editingVehicleId = null;

const vehicleForm = document.getElementById('vehicle-form');
const formTitle = document.getElementById('form-title');
const btnCancel = document.getElementById('btn-cancel');
const vehiclesTableBody = document.getElementById('vehicles-table-body');

document.addEventListener('DOMContentLoaded', () => {
    fetchVehicles();
    
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', handleFormSubmit);
    }
    if (btnCancel) {
        btnCancel.addEventListener('click', resetForm);
    }
    
    hideAllErrors();
});


async function fetchVehicles() {
    try {
        const { data, error } = await window.supabaseClient
            .from('vehicles')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        vehiclesState = data || [];
        renderVehiclesTable(vehiclesState);
    } catch (error) {
        console.error("Error fetching vehicles:", error.message);
    }
}


function renderVehiclesTable(data) {
    if (!vehiclesTableBody) return;
    vehiclesTableBody.innerHTML = '';

    if (data.length === 0) {
        vehiclesTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nu s-au găsit vehicule.</td></tr>`;
        return;
    }

    data.forEach(vehicle => {
        let badgeClass = 'badge-archived';
        if (vehicle.status === 'Activ') badgeClass = 'badge-success';
        if (vehicle.status === 'În service') badgeClass = 'badge-warning';
        if (vehicle.status === 'Indisponibil') badgeClass = 'badge-danger';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(vehicle.license_plate)}</strong></td>
            <td>${escapeHtml(vehicle.make)}</td>
            <td>${escapeHtml(vehicle.model)}</td>
            <td>${vehicle.manufacture_year || '-'}</td>
            <td>${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '0 km'}</td>
            <td>${escapeHtml(vehicle.fuel_type || '-')}</td>
            <td>
                <span class="badge ${badgeClass}">${escapeHtml(vehicle.status)}</span>
            </td>
            <td>
                <button type="button" class="action-btn btn-view" title="View Details" onclick="viewVehicleDetails(${vehicle.id})">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button type="button" class="action-btn btn-edit" title="Edit Vehicle" onclick="prepareEditVehicle(${vehicle.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="action-btn btn-delete" title="Delete Vehicle" onclick="deleteVehicle(${vehicle.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        vehiclesTableBody.appendChild(row);
    });
}


function hideAllErrors() {
    const errorSpans = document.querySelectorAll('.error-message');
    errorSpans.forEach(span => span.style.display = 'none');
}

async function validateVehicle(formData) {
    hideAllErrors();
    let isValid = true;

    if (!formData.license_plate) {
        document.getElementById('err-registration').style.display = 'block';
        isValid = false;
    }

    const year = formData.manufacture_year;
    if (!year || year < 1990 || year > 2026) {
        document.getElementById('err-year').style.display = 'block';
        isValid = false;
    }

    const mileage = formData.mileage;
    if (mileage < 0) {
        document.getElementById('err-mileage').style.display = 'block';
        isValid = false;
    }

    if (formData.vin && formData.vin.length > 0 && formData.vin.length < 10) {
        document.getElementById('err-vin').style.display = 'block';
        isValid = false;
    }

    if (isValid) {
        const isUnique = await checkLicensePlateUniqueness(formData.license_plate, editingVehicleId);
        if (!isUnique) {
            const regError = document.getElementById('err-registration');
            regError.innerText = "This registration number already exists.";
            regError.style.display = 'block';
            isValid = false;
        }
    }

    return isValid;
}

async function checkLicensePlateUniqueness(plate, currentId) {
    let query = window.supabaseClient
        .from('vehicles')
        .select('id')
        .eq('license_plate', plate);
    
    if (currentId) query = query.neq('id', currentId);
    
    const { data, error } = await query;
    if (error) return false;
    return data.length === 0;
}


async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        license_plate: document.getElementById('registration-number').value.trim().toUpperCase(),
        make: document.getElementById('brand').value.trim(),
        model: document.getElementById('model').value.trim(),
        manufacture_year: parseInt(document.getElementById('year').value) || null,
        mileage: parseInt(document.getElementById('mileage').value) || 0,
        vin: document.getElementById('vin').value.trim().toUpperCase(),
        fuel_type: document.getElementById('fuel-type').value,
        status: document.getElementById('status').value || 'Activ',
        color: document.getElementById('color').value.trim()
    };

    const isValid = await validateVehicle(formData);
    if (!isValid) return;

    try {
        if (editingVehicleId) {
            const { error } = await window.supabaseClient
                .from('vehicles')
                .update(formData)
                .eq('id', editingVehicleId);
            if (error) throw error;
        } else {
            const { error } = await window.supabaseClient
                .from('vehicles')
                .insert([formData]);
            if (error) throw error;
        }

        resetForm();
        fetchVehicles();
    } catch (error) {
        console.error("Database CRUD Error:", error.message);
        alert("Error saving vehicle: " + error.message);
    }
}


function prepareEditVehicle(id) {
    const vehicle = vehiclesState.find(v => v.id === id);
    if (!vehicle) return;

    editingVehicleId = id;
    if (formTitle) formTitle.innerText = "Edit Vehicle";
    if (btnCancel) btnCancel.style.display = "inline-flex"; 

    document.getElementById('registration-number').value = vehicle.license_plate;
    document.getElementById('brand').value = vehicle.make;
    document.getElementById('model').value = vehicle.model;
    document.getElementById('year').value = vehicle.manufacture_year || '';
    document.getElementById('mileage').value = vehicle.mileage || '';
    document.getElementById('vin').value = vehicle.vin || '';
    document.getElementById('fuel-type').value = vehicle.fuel_type || '';
    document.getElementById('status').value = vehicle.status || 'Activ';
    document.getElementById('color').value = vehicle.color || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}


async function deleteVehicle(id) {
    const confirmation = confirm("Sigur doriți să ștergeți vehiculul?");
    if (!confirmation) return;

    try {
        const { error } = await window.supabaseClient
            .from('vehicles')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (editingVehicleId === id) resetForm();
        fetchVehicles();
    } catch (error) {
        console.error("Deletion query error:", error.message);
    }
}

function viewVehicleDetails(id) {
    const vehicle = vehiclesState.find(v => v.id === id);
    if (!vehicle) return;
    alert(`Registration: ${vehicle.license_plate}\nBrand/Model: ${vehicle.make} ${vehicle.model}\nVIN: ${vehicle.vin || 'N/A'}`);
}

function resetForm() {
    editingVehicleId = null;
    hideAllErrors();
    if (vehicleForm) vehicleForm.reset();
    if (formTitle) formTitle.innerText = "Add New Vehicle";
    if (btnCancel) btnCancel.style.display = "none";
    document.getElementById('err-registration').innerText = "Registration number is required."; 
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