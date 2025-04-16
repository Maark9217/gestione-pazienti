import { supabase } from './config.js';

export class PatientManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadPatients();
    }

    async loadPatients() {
        try {
            // Ottieni prima gli appuntamenti del dottore corrente
            const { data: doctorAppointments, error: appointmentsError } = await supabase
                .from('appointments')
                .select('patient_id')
                .eq('doctor_id', window.currentDoctor.id);

            if (appointmentsError) throw appointmentsError;

            // Crea un set di ID dei pazienti unici per questo dottore
            const patientIds = [...new Set(doctorAppointments.map(app => app.patient_id))];

            // Ottieni i dettagli dei pazienti
            const { data: patients, error: patientsError } = await supabase
                .from('patients')
                .select(`
                    *,
                    appointments!inner (
                        id,
                        date,
                        duration,
                        notes,
                        doctor_id
                    )
                `)
                .in('id', patientIds)
                .eq('appointments.doctor_id', window.currentDoctor.id)
                .order('surname');

            if (patientsError) throw patientsError;

            this.renderPatientsList(patients);
        } catch (error) {
            console.error('Errore caricamento pazienti:', error);
        }
    }

    renderPatientsList(patients) {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="patients-section">
                <div class="patients-header">
                    <h1>Pazienti</h1>
                    <button class="btn-primary" onclick="window.patientManager.showNewPatientForm()">
                        <i class="fas fa-plus"></i> Nuovo Paziente
                    </button>
                </div>
                <div class="search-box">
                    <input type="text" id="patient-search" placeholder="Cerca paziente...">
                </div>
                <div class="patients-grid">
                    ${patients.map(patient => this.renderPatientCard(patient)).join('')}
                </div>
            </div>
        `;
        this.setupSearch();
    }

    renderPatientCard(patient) {
        const lastAppointment = patient.appointments
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            
        return `
            <div class="patient-card" onclick="window.patientManager.showPatientDetails('${patient.id}')">
                <div class="patient-card-header">
                    <h3>${patient.surname} ${patient.name}</h3>
                </div>
                <div class="patient-card-body">
                    ${patient.phone ? `<p><i class="fas fa-phone"></i> ${patient.phone}</p>` : ''}
                    ${patient.email ? `<p><i class="fas fa-envelope"></i> ${patient.email}</p>` : ''}
                    ${lastAppointment ? `
                        <div class="last-appointment">
                            <p>Ultimo appuntamento:</p>
                            <p>${new Date(lastAppointment.date).toLocaleDateString()}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    setupSearch() {
        const searchInput = document.getElementById('patient-search');
        searchInput?.addEventListener('input', async (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length >= 2) {
                const { data: results, error } = await supabase
                    .from('patients')
                    .select('*')
                    .or(`name.ilike.%${query}%,surname.ilike.%${query}%`);

                if (!error) {
                    document.querySelector('.patients-grid').innerHTML = 
                        results.map(patient => this.renderPatientCard(patient)).join('');
                }
            } else {
                this.loadPatients();
            }
        });
    }

    async showPatientDetails(patientId) {
        try {
            const [patientData, clinicalNotes] = await Promise.all([
                supabase.from('patients')
                    .select('*, appointments(*)')
                    .eq('id', patientId)
                    .single(),
                supabase.from('clinical_notes')
                    .select('*')
                    .eq('patient_id', patientId)
                    .order('visit_date', { ascending: false })
            ]);

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content patient-details">
                    <h2>Dettagli Paziente</h2>
                    <div class="patient-share-info">
                        ${await this.getSharedDoctorsInfo(patientId)}
                    </div>
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="info">Info Generali</button>
                        <button class="tab-btn" data-tab="clinical">Note Cliniche</button>
                        <button class="tab-btn" data-tab="appointments">Appuntamenti</button>
                    </div>

                    <div class="tab-content" id="info-tab">
                        <form id="patient-form">
                            <input type="hidden" name="patient-id" value="${patientData.data.id}">
                            <div class="form-group">
                                <label>Nome</label>
                                <input type="text" name="name" value="${patientData.data.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Cognome</label>
                                <input type="text" name="surname" value="${patientData.data.surname || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value="${patientData.data.email || ''}">
                            </div>
                            <div class="form-group">
                                <label>Telefono</label>
                                <input type="tel" name="phone" value="${patientData.data.phone || ''}">
                            </div>
                        </form>
                    </div>

                    <div class="tab-content hidden" id="clinical-tab">
                        <div class="clinical-notes-header">
                            <h3>Note Cliniche</h3>
                            <button class="btn-primary" onclick="window.patientManager.addClinicalNote('${patientId}')">
                                <i class="fas fa-plus"></i> Nuova Nota
                            </button>
                        </div>
                        <div class="clinical-notes-list">
                            ${this.renderClinicalNotes(clinicalNotes.data)}
                        </div>
                    </div>

                    <div class="tab-content hidden" id="appointments-tab">
                        <div class="appointments-history">
                            ${this.renderAppointmentsHistory(patientData.data.appointments)}
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="window.patientManager.closeModal()">Chiudi</button>
                        <button type="button" class="btn-primary" onclick="window.patientManager.showSharePatientModal('${patientId}')">Condividi</button>
                        <button type="button" class="btn-primary" onclick="window.patientManager.savePatient()">Salva Modifiche</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.setupTabHandlers();
        } catch (error) {
            console.error('Errore caricamento dettagli paziente:', error);
        }
    }

    async getSharedDoctorsInfo(patientId) {
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                doctor:doctor_id (
                    id,
                    name,
                    surname
                )
            `)
            .eq('patient_id', patientId);

        if (error) throw error;

        // Rimuovi duplicati basati sull'ID del dottore
        const uniqueDoctors = [...new Map(
            appointments.map(a => [a.doctor.id, a.doctor])
        ).values()];

        if (!uniqueDoctors?.length) return '';

        return `
            <div class="shared-doctors">
                <h4>Medici che seguono questo paziente:</h4>
                <ul>
                    ${uniqueDoctors.map(d => `<li>${d.name} ${d.surname}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    async showSharePatientModal(patientId) {
        const { data: doctors } = await supabase
            .from('doctors')
            .select('*')
            .neq('id', window.currentDoctor.id);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Condividi con altro medico</h3>
                <form id="share-patient-form">
                    <div class="form-group">
                        <label>Seleziona medico</label>
                        <select name="doctor_id" required>
                            ${doctors.map(d => `
                                <option value="${d.id}">${d.name} ${d.surname}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="window.patientManager.closeModal()">Annulla</button>
                        <button type="submit" class="btn-primary">Condividi</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('share-patient-form').onsubmit = async (e) => {
            e.preventDefault();
            const doctorId = e.target.doctor_id.value;
            
            try {
                await supabase.from('appointments').insert({
                    doctor_id: doctorId,
                    patient_id: patientId,
                    date: new Date().toISOString(),
                    duration: 0,
                    notes: 'Paziente condiviso'
                });

                this.closeModal();
                await this.loadPatients();
            } catch (error) {
                console.error('Errore condivisione paziente:', error);
                alert('Errore durante la condivisione del paziente');
            }
        };
    }

    async addClinicalNote(patientId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Nuova Nota Clinica</h3>
                <form id="clinical-note-form">
                    <input type="hidden" name="patient_id" value="${patientId}">
                    <div class="form-group">
                        <label>Data Visita</label>
                        <input type="datetime-local" name="visit_date" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo Trattamento</label>
                        <input type="text" name="treatment_type" required>
                    </div>
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="notes" rows="4" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Prossimo Trattamento</label>
                        <textarea name="next_treatment" rows="2"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="window.patientManager.closeModal()">Annulla</button>
                        <button type="submit" class="btn-primary">Salva</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        this.setupClinicalNoteForm(patientId);
    }

    renderClinicalNotes(notes) {
        if (!notes?.length) return '<p class="no-notes">Nessuna nota clinica presente</p>';
        
        return notes.map(note => `
            <div class="clinical-note-card">
                <div class="note-header">
                    <div class="note-date">
                        ${new Date(note.visit_date).toLocaleString('it-IT')}
                    </div>
                    <div class="note-treatment">${note.treatment_type}</div>
                </div>
                <div class="note-content">
                    <p class="note-text">${note.notes}</p>
                    ${note.next_treatment ? `
                        <div class="next-treatment">
                            <strong>Prossimo trattamento:</strong>
                            <p>${note.next_treatment}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderAppointmentsHistory(appointments) {
        if (!appointments?.length) return '<p>Nessun appuntamento precedente</p>';
        
        return appointments
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(app => `
                <div class="history-item">
                    <div class="history-date">${new Date(app.date).toLocaleDateString()} ${new Date(app.date).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</div>
                    <div class="history-duration">${app.duration} min</div>
                    ${app.notes ? `<div class="history-notes">${app.notes}</div>` : ''}
                </div>
            `).join('');
    }

    setupPatientForm() {
        const form = document.getElementById('patient-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const patientId = formData.get('patient-id');
            
            try {
                await supabase
                    .from('patients')
                    .update({
                        name: formData.get('name'),
                        surname: formData.get('surname'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        notes: formData.get('notes')
                    })
                    .eq('id', patientId);

                this.closeModal();
                this.loadPatients();
            } catch (error) {
                console.error('Errore aggiornamento paziente:', error);
                alert('Errore durante il salvataggio');
            }
        };
    }

    setupClinicalNoteForm(patientId) {
        const form = document.getElementById('clinical-note-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            try {
                const { data, error } = await supabase
                    .from('clinical_notes')
                    .insert({
                        patient_id: patientId,
                        visit_date: formData.get('visit_date'),
                        treatment_type: formData.get('treatment_type'),
                        notes: formData.get('notes'),
                        next_treatment: formData.get('next_treatment')
                    })
                    .select()
                    .single();

                if (error) throw error;

                this.closeModal();
                this.showPatientDetails(patientId);
            } catch (error) {
                console.error('Errore creazione nota clinica:', error);
                alert('Errore durante il salvataggio della nota clinica');
            }
        };
    }

    setupTabHandlers() {
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.add('hidden'));

                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-tab`).classList.remove('hidden');
            });
        });
    }

    showNewPatientForm() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Nuovo Paziente</h2>
                <form id="new-patient-form">
                    <div class="form-group">
                        <label>Nome</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Cognome</label>
                        <input type="text" name="surname" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email">
                    </div>
                    <div class="form-group">
                        <label>Telefono</label>
                        <input type="tel" name="phone">
                    </div>
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="notes" rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="window.patientManager.closeModal()">Annulla</button>
                        <button type="submit" class="btn-primary">Salva</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const form = document.getElementById('new-patient-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            try {
                // Crea prima il paziente
                const { data: patient, error: patientError } = await supabase
                    .from('patients')
                    .insert({
                        name: formData.get('name'),
                        surname: formData.get('surname'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        notes: formData.get('notes'),
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (patientError) throw patientError;

                // Crea un appuntamento vuoto per associare il paziente al dottore
                await supabase
                    .from('appointments')
                    .insert({
                        doctor_id: window.currentDoctor.id,
                        patient_id: patient.id,
                        date: new Date().toISOString(),
                        duration: 0,
                        notes: 'Prima registrazione paziente'
                    });

                this.closeModal();
                await this.loadPatients();
                
            } catch (error) {
                console.error('Errore creazione paziente:', error);
                alert('Errore durante il salvataggio del paziente');
            }
        };
    }

    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    }
}

// Inizializzazione globale
window.patientManager = new PatientManager();
