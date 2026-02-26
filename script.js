let appointments = [];
let selectedTimeSlot = null;

const availableTimeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const storeKey = 'clinicAppointments';
const dom = {
    form: $('appointmentForm'),
    date: $('appointmentDate'),
    doctor: $('doctorSelect'),
    timeSlots: $('timeSlots'),
    msg: $('formMessage'),
    list: $('appointmentsList'),
    empty: $('emptyState'),
    filterDate: $('filterDate'),
    filterDoctor: $('filterDoctor'),
    clearFilters: $('clearFilters')
};

document.addEventListener('DOMContentLoaded', () => {
    const stored = localStorage.getItem(storeKey);
    if (stored) appointments = JSON.parse(stored);

    dom.date.min = new Date().toISOString().split('T')[0];

    dom.form.addEventListener('submit', handleFormSubmit);
    dom.date.addEventListener('change', updateTimeSlots);
    dom.doctor.addEventListener('change', updateTimeSlots);
    dom.filterDate.addEventListener('change', applyFilters);
    dom.filterDoctor.addEventListener('change', applyFilters);
    dom.clearFilters.addEventListener('click', clearFilters);

    $$('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            $$('.nav-link').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.querySelector(e.currentTarget.getAttribute('href'))
                .scrollIntoView({ behavior: 'smooth' });
        });
    });

    renderAppointments();
});

function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const name = $('patientName').value.trim();
    const phone = $('phoneNumber').value.trim();
    const doctor = dom.doctor.value;
    const date = dom.date.value;

    if (!validateForm(name, phone, doctor, date, selectedTimeSlot)) return;

    if (isSlotBooked(doctor, date, selectedTimeSlot)) {
        showMessage('This time slot is already booked. Please select another time.', 'error');
        return;
    }

    appointments.push({
        id: createId(),
        patientName: name,
        phoneNumber: phone,
        doctor,
        date,
        timeSlot: selectedTimeSlot,
        createdAt: new Date().toISOString()
    });

    persistAppointments();
    showMessage('Appointment booked successfully!', 'success');
    dom.form.reset();
    selectedTimeSlot = null;
    dom.timeSlots.innerHTML = '';
    renderAppointments();
    setTimeout(() => $('dashboard').scrollIntoView({ behavior: 'smooth' }), 1500);
}

function validateForm(name, phone, doctor, date, time) {
    let isValid = true;

    if (!name || name.length < 2 || !/^[a-zA-Z\s]+$/.test(name)) {
        showError('nameError', 'Please enter a valid name (letters only, min 2 characters)', 'patientName');
        isValid = false;
    }

    if (!phone || !/^\d{11}$/.test(phone.replace(/[\s-]/g, ''))) {
        showError('phoneError', 'Please enter a valid 11-digit phone number', 'phoneNumber');
        isValid = false;
    }

    if (!doctor) {
        showError('doctorError', 'Please select a doctor', 'doctorSelect');
        isValid = false;
    }

    if (!date) {
        showError('dateError', 'Please select an appointment date', 'appointmentDate');
        isValid = false;
    } else if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
        showError('dateError', 'Please select a future date', 'appointmentDate');
        isValid = false;
    }

    if (!time) {
        showError('timeError', 'Please select a time slot');
        isValid = false;
    }

    return isValid;
}

function showError(errorId, message, inputId) {
    $(errorId).textContent = message;
    $(errorId).classList.add('show');
    if (inputId) $(inputId).classList.add('error');
}

function showMessage(message, type) {
    dom.msg.textContent = message;
    dom.msg.className = `form-message show ${type}`;
}


function updateTimeSlots() {
    const doctor = dom.doctor.value;
    const date = dom.date.value;
    const container = dom.timeSlots;

    container.innerHTML = '';
    if (!doctor || !date) return;

    availableTimeSlots.forEach(slot => {
        const div = document.createElement('div');
        div.className = 'time-slot';
        div.textContent = slot;

        if (isSlotBooked(doctor, date, slot)) {
            div.classList.add('disabled');
            div.title = 'Already booked';
        } else {
            div.addEventListener('click', () => selectTimeSlot(slot, div));
        }
        container.appendChild(div);
    });
}


function renderAppointments(list = appointments) {
    const container = dom.list;
    const empty = dom.empty;

    container.innerHTML = '';

    if (list.length === 0) {
        empty.classList.add('show');
        container.style.display = 'none';
        return;
    }

    empty.classList.remove('show');
    container.style.display = 'grid';

    [...list]
        .sort((a, b) => new Date(`${b.date} ${b.timeSlot}`) - new Date(`${a.date} ${a.timeSlot}`))
        .forEach(apt => container.appendChild(createAppointmentCard(apt)));
}

function cancelAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    appointments = appointments.filter(apt => apt.id !== id);
    persistAppointments();
    renderAppointments();
    alert('Appointment cancelled successfully');
}


function applyFilters() {
    const filterDate = dom.filterDate.value;
    const filterDoctor = dom.filterDoctor.value;

    const filtered = appointments.filter(apt =>
        (!filterDate || apt.date === filterDate) &&
        (!filterDoctor || apt.doctor === filterDoctor)
    );

    renderAppointments(filtered);
}

function clearFilters() {
    dom.filterDate.value = '';
    dom.filterDoctor.value = '';
    renderAppointments();
}

function clearFormErrors() {
    $$('.error-message').forEach(err => err.classList.remove('show'));
    $$('.form-input').forEach(input => input.classList.remove('error'));
    dom.msg.classList.remove('show');
}

function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function persistAppointments() {
    localStorage.setItem(storeKey, JSON.stringify(appointments));
}

function isSlotBooked(doctor, date, slot) {
    return appointments.some(apt => apt.doctor === doctor && apt.date === date && apt.timeSlot === slot);
}

function selectTimeSlot(slot, element) {
    $$('.time-slot').forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    selectedTimeSlot = slot;
}

function createAppointmentCard(apt) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    card.innerHTML = `
        <div class="appointment-info">
            <div class="info-item">
                <span class="info-label">Patient Name</span>
                <span class="info-value">${apt.patientName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Phone</span>
                <span class="info-value">${apt.phoneNumber}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Doctor</span>
                <span class="info-value">${apt.doctor.split(' - ')[0]}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Date</span>
                <span class="info-value">${new Date(apt.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Time</span>
                <span class="info-value">${apt.timeSlot}</span>
            </div>
        </div>
        <div class="appointment-actions">
            <button class="delete-btn" onclick="cancelAppointment('${apt.id}')">
                Cancel
            </button>
        </div>
    `;
    return card;
}
