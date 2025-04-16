import { supabase, getAppointments, addAppointment, searchPatients, addNewPatient, updateAppointment, deleteAppointment } from './config.js'

export class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.appointments = [];
        this.weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
        window.calendar = this;
        this.init();
        this.setupNewAppointmentButton();

        window.editAppointment = (appointmentId) => this.editAppointment(appointmentId);
        window.deleteAppointment = (appointmentId) => this.deleteAppointment(appointmentId);
    }

    async loadAppointments() {
        try {
            if (!window.currentDoctor) return;
            this.appointments = await getAppointments(window.currentDoctor.id);
            this.updateAppointments();
        } catch (error) {
            console.error('Errore caricamento appuntamenti:', error);
            this.appointments = [];
            this.updateAppointments();
        }
    }

    async addNewAppointment(data) {
        try {
            const appointmentData = {
                doctor_id: window.currentDoctor.id,
                patient_id: data.patient_id,
                date: data.date.toISOString(),
                duration: data.duration,
                notes: data.notes || ''
            };
            
            await addAppointment(appointmentData);
        } catch (error) {
            console.error('Errore creazione appuntamento:', error);
            throw error;
        }
    }

    async editAppointment(appointmentId) {
        const appointment = this.appointments.find(app => app.id === appointmentId);
        if (!appointment) return;

        const template = document.getElementById('new-appointment-modal');
        const modal = template.content.cloneNode(true);
        document.body.appendChild(modal);

        const form = document.getElementById('appointment-form');
        const nameInput = document.getElementById('patient-name');
        const dateInput = document.getElementById('appointment-date');
        const durationInput = document.getElementById('appointment-duration');
        const notesInput = document.getElementById('appointment-notes');

        nameInput.value = `${appointment.patients.name} ${appointment.patients.surname}`;
        nameInput.disabled = true;
        
        const appointmentDate = new Date(appointment.date);
        dateInput.value = appointmentDate.toISOString().slice(0, 16);
        durationInput.value = appointment.duration;
        notesInput.value = appointment.notes || '';

        form.onsubmit = async (e) => {
            e.preventDefault();
            try {
                await updateAppointment(appointmentId, {
                    date: new Date(dateInput.value).toISOString(),
                    duration: parseInt(durationInput.value),
                    notes: notesInput.value
                });

                this.closeAppointmentModal();
                await this.loadAppointments();
            } catch (error) {
                console.error('Errore aggiornamento appuntamento:', error);
                alert('Errore durante l\'aggiornamento dell\'appuntamento');
            }
        };
    }

    async deleteAppointment(appointmentId) {
        if (confirm('Sei sicuro di voler eliminare questo appuntamento?')) {
            try {
                await deleteAppointment(appointmentId);
                await this.loadAppointments();
                this.renderCalendar(); // Aggiungiamo questa riga per aggiornare gli indicatori
            } catch (error) {
                console.error('Errore eliminazione appuntamento:', error);
                alert('Errore durante l\'eliminazione dell\'appuntamento');
            }
        }
    }

    async init() {
        await this.loadAppointments();
        this.renderCalendar();
        this.attachEventListeners();
    }

    renderWeekDays() {
        const weekdaysContainer = document.querySelector('.weekdays');
        this.weekDays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.textContent = day;
            weekdaysContainer.appendChild(dayElement);
        });
    }

    renderCalendar() {
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                          'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        
        document.getElementById('current-month').textContent = 
            `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        this.renderDays();
    }

    renderDays() {
        const daysContainer = document.querySelector('.days');
        daysContainer.innerHTML = '';

        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        const appointmentDays = {};
        this.appointments.forEach(app => {
            const date = new Date(app.date);
            if (date.getMonth() === this.currentDate.getMonth() && 
                date.getFullYear() === this.currentDate.getFullYear()) {
                const day = date.getDate();
                appointmentDays[day] = (appointmentDays[day] || 0) + 1;
            }
        });

        let firstDayIndex = firstDay.getDay() || 7;
        firstDayIndex = firstDayIndex - 1;

        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day empty';
            daysContainer.appendChild(emptyDay);
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day';

            const dayContent = document.createElement('div');
            dayContent.className = 'day-content';
            dayContent.textContent = day;
            dayDiv.appendChild(dayContent);

            if (appointmentDays[day]) {
                const dots = document.createElement('div');
                dots.className = 'appointment-dots';
                const numDots = Math.min(appointmentDays[day], 3);
                dots.innerHTML = '•'.repeat(numDots);
                dayDiv.appendChild(dots);
            }

            if (day === this.selectedDate.getDate() && 
                this.currentDate.getMonth() === this.selectedDate.getMonth()) {
                dayDiv.classList.add('selected');
            }

            dayDiv.addEventListener('click', () => this.selectDate(day));
            daysContainer.appendChild(dayDiv);
        }
    }

    selectDate(day) {
        document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
        
        const selectedDay = Array.from(document.querySelectorAll('.day:not(.empty)'))
            .find(d => parseInt(d.textContent) === day);
        if (selectedDay) {
            selectedDay.classList.add('selected');
            this.selectedDate = new Date(this.currentDate.getFullYear(), 
                                      this.currentDate.getMonth(), day);
            this.updateAppointments();
        }
    }

    updateAppointments() {
        const container = document.getElementById('daily-appointments');
        const dayAppointments = this.appointments?.filter(app => {
            const appDate = new Date(app.date);
            return appDate.toDateString() === this.selectedDate.toDateString();
        });

        if (!dayAppointments?.length) {
            container.innerHTML = '<p class="no-appointments">Nessun appuntamento per oggi</p>';
            return;
        }

        container.innerHTML = dayAppointments.map(app => `
            <div class="appointment-card">
                <div class="appointment-time">${new Date(app.date).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</div>
                <div class="appointment-info">
                    <div class="appointment-patient">${app.patients.name} ${app.patients.surname}</div>
                    <div class="appointment-duration">${app.duration} min</div>
                    ${app.notes ? `<div class="appointment-notes">${app.notes}</div>` : ''}
                </div>
                <div class="appointment-actions">
                    <button onclick="editAppointment('${app.id}')" class="edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteAppointment('${app.id}')" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    attachEventListeners() {
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
    }

    setupNewAppointmentButton() {
        const addButton = document.createElement('button');
        addButton.className = 'btn-primary add-appointment';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Nuovo Appuntamento';
        addButton.onclick = () => this.showNewAppointmentModal();
        
        document.querySelector('.calendar-header').appendChild(addButton);
    }

    showNewAppointmentModal() {
        const template = document.getElementById('new-appointment-modal');
        const modal = template.content.cloneNode(true);
        document.body.appendChild(modal);

        const dateInput = document.getElementById('appointment-date');
        
        // Imposta i limiti di orario basati sulle impostazioni del dottore
        if (window.settingsManager?.currentSettings) {
            const settings = window.settingsManager.currentSettings;
            const today = new Date();
            const dayOfWeek = today.getDay();
            
            // Controlla se oggi è un giorno lavorativo
            if (!settings.working_days.includes(dayOfWeek)) {
                dateInput.disabled = true;
                alert('Seleziona un giorno lavorativo');
                return;
            }

            // Imposta gli orari disponibili
            const [startHour, startMinute] = settings.start_time.split(':');
            const [endHour, endMinute] = settings.end_time.split(':');
            
            const minTime = `${startHour}:${startMinute}`;
            const maxTime = `${endHour}:${endMinute}`;
            
            dateInput.min = `${today.toISOString().split('T')[0]}T${minTime}`;
            dateInput.max = `${today.toISOString().split('T')[0]}T${maxTime}`;
        }

        const form = document.getElementById('appointment-form');
        const appointmentDate = document.getElementById('appointment-date');

        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        appointmentDate.min = today.toISOString().slice(0, 16);
        
        form.onsubmit = (e) => {
            e.preventDefault();
            const patientName = document.getElementById('patient-name').value;
            const date = appointmentDate.value;
            const duration = document.getElementById('appointment-duration').value;
            const notes = document.getElementById('appointment-notes').value;

            if (!patientName || !date) {
                alert('Compila tutti i campi richiesti');
                return;
            }

            this.handleNewAppointment({
                patient_name: patientName,
                date: date,
                duration: duration,
                notes: notes
            });
        };
    }

    async handleNewAppointment(appointmentData) {
        try {
            const [name, surname] = appointmentData.patient_name.split(' ');
            
            const patientData = {
                name: name || appointmentData.patient_name,
                surname: surname || '',
                created_at: new Date().toISOString()
            };

            const patient = await addNewPatient(patientData);
            
            await this.addNewAppointment({
                patient_id: patient.id,
                date: new Date(appointmentData.date),
                duration: parseInt(appointmentData.duration),
                notes: appointmentData.notes
            });
            
            this.closeAppointmentModal();
            await this.loadAppointments();
        } catch (error) {
            console.error('Errore salvataggio appuntamento:', error);
            alert('Errore nel salvataggio: ' + error.message);
        }
    }

    setupPatientSearch() {
        const searchInput = document.getElementById('patient-search');
        const resultsDiv = document.getElementById('patient-results');
        const form = document.getElementById('appointment-form');
        
        const oldHiddenInput = form.querySelector('input[name="patient-id"]');
        if (oldHiddenInput) oldHiddenInput.remove();

        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value;
            if (query.length < 2) {
                resultsDiv.innerHTML = '';
                return;
            }

            try {
                const patients = await searchPatients(query);
                resultsDiv.innerHTML = patients.map(patient => `
                    <div class="search-result-item" 
                         data-id="${patient.id}" 
                         data-name="${patient.name}"
                         data-surname="${patient.surname}">
                        ${patient.name} ${patient.surname}
                    </div>
                `).join('');

                resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const patientId = item.dataset.id;
                        const patientName = `${item.dataset.name} ${item.dataset.surname}`;
                        
                        searchInput.value = patientName;
                        
                        let hiddenInput = form.querySelector('input[name="patient-id"]');
                        if (!hiddenInput) {
                            hiddenInput = document.createElement('input');
                            hiddenInput.type = 'hidden';
                            hiddenInput.name = 'patient-id';
                            form.appendChild(hiddenInput);
                        }
                        hiddenInput.value = patientId;
                        
                        resultsDiv.innerHTML = '';
                    });
                });
            } catch (error) {
                console.error('Errore ricerca pazienti:', error);
                resultsDiv.innerHTML = '<div class="error">Errore nella ricerca</div>';
            }
        });
    }

    closeAppointmentModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    }
}

window.closeAppointmentModal = () => {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
};
