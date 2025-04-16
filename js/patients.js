import { supabase } from './db-config.js';
import { Auth } from './auth.js';

class PatientManager {
    constructor() {
        this.currentPatient = null;
        this.isSaving = false;
        this.isLoading = false;
        this.cache = new Map();
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-item[data-page="pazienti"]')) {
                this.renderPatientsList();
            }
        });

        // Delegazione eventi per i tab e le azioni
        document.addEventListener('click', (e) => {
            const target = e.target;

            // Gestione tab
            if (target.classList.contains('tab-button')) {
                this.switchTab(target);
            }

            // Gestione azioni
            if (target.closest('.add-diagnosis')) {
                this.addDiagnosis(target.closest('.diagnosis-list'));
            }

            if (target.closest('.add-visit')) {
                this.addVisit(target.closest('.visits-timeline'));
            }

            if (target.closest('.upload-doc')) {
                this.handleDocumentUpload();
            }

            // Gestione rimozioni
            if (target.closest('.remove-diagnosis')) {
                target.closest('.diagnosis-item').remove();
            }

            if (target.closest('.remove-visit')) {
                target.closest('.visit-item').remove();
            }
        });
    }

    async renderPatientsList() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const mainContent = document.getElementById('main-content');
            mainContent.innerHTML = `
                <div class="patients-container">
                    <div class="patients-header">
                        <h2>Lista Pazienti</h2>
                        <button class="add-patient-btn" onclick="window.openNewPatientModal()">
                            <i class="fas fa-plus"></i> Nuovo Paziente
                        </button>
                    </div>
                    <div id="patients-list" class="patients-list"></div>
                </div>
            `;

            const patientsList = document.getElementById('patients-list');
            const patients = await this.loadPatients();

            // Pulisci cache vecchia
            this.cleanCache();

            // Aggiungi alla cache e renderizza
            patients.forEach(patient => {
                this.cache.set(patient.id, patient);
                patientsList.appendChild(this.createPatientCard(patient));
            });

        } catch (error) {
            console.error('Error rendering patients:', error);
            this.showNotification('Errore nel caricamento pazienti', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    cleanCache() {
        const now = Date.now();
        for (const [id, data] of this.cache.entries()) {
            if (now - data.timestamp > 300000) { // 5 minuti
                this.cache.delete(id);
            }
        }
    }

    createPatientCard(patient) {
        const card = document.createElement('div');
        card.className = 'patient-card';
        
        // Usa i nomi corretti dei campi
        const fullName = `${patient.name || ''} ${patient.surname || ''}`.trim();
        const age = this.calculateAge(patient.birth_date);
        
        card.innerHTML = `
            <div class="patient-card-header">
                <h3>${fullName}</h3>
                <span class="patient-age">${age ? `${age} anni` : ''}</span>
            </div>
            <div class="patient-card-body">
                <p class="patient-info">${patient.phone || 'Nessun telefono'}</p>
                <div class="patient-actions">
                    <button class="view-details-btn" data-patient-id="${patient.id}">
                        <i class="fas fa-folder-open"></i> Apri Scheda
                    </button>
                    <button class="delete-patient-btn" data-patient-id="${patient.id}">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </div>
            </div>
        `;

        card.querySelector('.view-details-btn').addEventListener('click', () => this.openPatientDetail(patient));
        card.querySelector('.delete-patient-btn').addEventListener('click', () => this.deletePatient(patient.id));
        
        return card;
    }

    calculateAge(birthdate) {
        if (!birthdate) return '';
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    openPatientDetail(patient) {
        if (!patient) return;

        const mainContent = document.getElementById('main-content');
        const template = document.getElementById('patient-detail-template');
        
        // Clona prima il template
        const clone = template.content.cloneNode(true);
        
        // Prepara l'header con il pulsante torna alla lista
        const headerHtml = `
            <div class="patient-detail-header">
                <button class="back-to-list" id="backToList">
                    <i class="fas fa-arrow-left"></i> Torna alla lista
                </button>
            </div>
        `;

        // Pulisci e inserisci il contenuto
        mainContent.innerHTML = headerHtml;
        mainContent.appendChild(clone);

        // Ora possiamo manipolare gli elementi del DOM
        const patientName = `${patient.name || ''} ${patient.surname || ''}`.trim();
        const patientNameEl = mainContent.querySelector('.patient-name');
        if (patientNameEl) patientNameEl.textContent = patientName || 'Paziente senza nome';

        const age = this.calculateAge(patient.birth_date);
        const patientAgeEl = mainContent.querySelector('.patient-age');
        if (patientAgeEl) patientAgeEl.textContent = age ? `${age} anni` : '';

        // Imposta i valori dei campi
        const fields = {
            '#patient-birthdate': patient.birth_date || '',
            '#patient-phone': patient.phone || '',
            '#patient-email': patient.email || ''
        };

        Object.entries(fields).forEach(([selector, value]) => {
            const element = mainContent.querySelector(selector);
            if (element) element.value = value;
        });

        // Aggiungi event listener per il pulsante torna alla lista
        const backButton = document.getElementById('backToList');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.renderPatientsList();
            });
        }

        // Salva il paziente corrente e inizializza la vista
        this.currentPatient = patient;
        this.initializeDetailView();
        this.loadAnamnesi(patient.id);
        this.loadDiagnoses(patient.id);
    }

    async loadPatientAppointments(patientId) {
        try {
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select(`
                    id,
                    date,
                    duration,
                    notes,
                    created_at,
                    doctor_id
                `)
                .eq('patient_id', patientId)
                .order('date', { ascending: false });

            if (error) {
                console.error('Query error:', error);
                throw error;
            }

            const visitsContainer = document.querySelector('.timeline-container');
            if (visitsContainer && appointments) {
                visitsContainer.innerHTML = '';
                appointments.forEach(app => {
                    const visitHtml = `
                        <div class="visit-item" data-id="${app.id}">
                            <div class="visit-date">
                                ${new Date(app.date).toLocaleDateString('it-IT', { 
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                                <span class="visit-duration">(${app.duration} min)</span>
                            </div>
                            <div class="visit-content">
                                <textarea class="visit-notes" rows="3">${app.notes || ''}</textarea>
                                <div class="visit-actions">
                                    <button class="save-visit-btn" onclick="window.patientManager.saveVisitChanges('${app.id}')">
                                        <i class="fas fa-save"></i> Salva
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    visitsContainer.insertAdjacentHTML('beforeend', visitHtml);
                });
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.showNotification('Errore nel caricamento degli appuntamenti', 'error');
        }
    }

    async saveVisitChanges(appointmentId) {
        try {
            const visitItem = document.querySelector(`.visit-item[data-id="${appointmentId}"]`);
            const notes = visitItem.querySelector('.visit-notes').value;

            const { error } = await supabase
                .from('appointments')
                .update({ notes: notes })
                .eq('id', appointmentId);

            if (error) throw error;
            this.showNotification('Appuntamento aggiornato', 'success');
        } catch (error) {
            console.error('Error saving appointment:', error);
            this.showNotification('Errore durante il salvataggio', 'error');
        }
    }

    async deleteVisit(appointmentId) {
        if (!confirm('Sei sicuro di voler eliminare questa visita?')) return;

        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointmentId);

            if (error) throw error;
            
            document.querySelector(`.visit-item[data-id="${appointmentId}"]`).remove();
            this.showNotification('Visita eliminata', 'success');
        } catch (error) {
            console.error('Error deleting visit:', error);
            this.showNotification('Errore durante l\'eliminazione', 'error');
        }
    }

    switchTab(tabButton) {
        const container = tabButton.closest('.patient-detail-container');
        const tabId = tabButton.dataset.tab;

        // Rimuovi active da tutti i tab
        container.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.remove('active');
        });
        container.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // Attiva il tab selezionato
        tabButton.classList.add('active');
        container.querySelector(`#${tabId}`).classList.add('active');
    }

    addDiagnosis(container, diagnosis = null) {
        const diagnosisItem = document.createElement('div');
        diagnosisItem.className = 'diagnosis-item';

        // Formatta la data nel formato locale
        const date = diagnosis?.data ? new Date(diagnosis.data) : new Date();
        const formattedDate = date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        diagnosisItem.innerHTML = `
            <div class="diagnosis-header">
                <input type="text" class="diagnosis-title" value="${diagnosis?.titolo || ''}" placeholder="Titolo diagnosi">
                <span class="diagnosis-date">${formattedDate}</span>
                <button type="button" class="remove-diagnosis">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <textarea class="diagnosis-description" rows="3" placeholder="Descrizione diagnosi...">${diagnosis?.descrizione || ''}</textarea>
        `;

        const addButton = container.querySelector('.add-diagnosis');
        container.insertBefore(diagnosisItem, addButton);
    }

    addVisit(container, visit = null) {
        const visitItem = document.createElement('div');
        visitItem.className = 'visit-item';
        visitItem.innerHTML = `
            <div class="visit-date">${visit?.date || new Date().toLocaleDateString()}</div>
            <div class="visit-content">
                <textarea class="visit-notes" rows="4" placeholder="Note della visita...">${visit?.notes || ''}</textarea>
                <div class="visit-attachments">
                    <button class="attach-file">+ Allega file</button>
                </div>
                <button type="button" class="remove-visit">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const timelineContainer = container.querySelector('.timeline-container');
        timelineContainer.insertBefore(visitItem, timelineContainer.firstChild);
    }

    async handleDocumentUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
        input.multiple = true;

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await this.uploadDocument(file, this.currentPatient.id);
            }
        };

        input.click();
    }

    async uploadDocument(file, patientId) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${patientId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('documenti')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
                .from('documenti')
                .insert({
                    paziente_id: patientId,
                    nome_file: fileName,
                    tipo: file.type
                });

            if (dbError) throw dbError;
            this.showNotification('Documento caricato con successo', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Errore durante il caricamento del documento', 'error');
        }
    }

    async loadDocuments() {
        if (!this.currentPatient) return;

        try {
            const { data, error } = await supabase
                .from('documenti')
                .select('*')
                .eq('paziente_id', this.currentPatient.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const documentsList = document.querySelector('.documents-list');
            documentsList.innerHTML = '';

            data.forEach(doc => {
                const docElement = this.createDocumentElement(doc);
                documentsList.appendChild(docElement);
            });
        } catch (error) {
            this.showNotification('Errore nel caricamento documenti', 'error');
            console.error('Error:', error);
        }
    }

    createDocumentElement(doc) {
        const docItem = document.createElement('div');
        docItem.className = 'document-item';

        const fileIcon = this.getFileIcon(doc.tipo);

        docItem.innerHTML = `
            <div class="document-content">
                <i class="${fileIcon}"></i>
                <span class="document-name">${doc.nome_file}</span>
                <span class="document-date">${new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
            <div class="document-actions">
                <button class="remove-doc" title="Rimuovi documento">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        docItem.querySelector('.remove-doc').addEventListener('click', async () => {
            await this.removeDocument(doc.id);
            docItem.remove();
        });

        return docItem;
    }

    async removeDocument(docId) {
        try {
            const { error } = await supabase
                .from('documenti')
                .delete()
                .eq('id', docId);

            if (error) throw error;
            this.showNotification('Documento rimosso', 'success');
        } catch (error) {
            this.showNotification('Errore durante la rimozione', 'error');
            console.error('Error:', error);
        }
    }

    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('image')) return 'fas fa-file-image';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        return 'fas fa-file';
    }

    async loadPatients() {
        try {
            const { data: patients, error } = await supabase
                .from('patients')
                .select('*')
                .eq('doctor_id', window.currentDoctor.id)  // Filtra per doctor_id
                .order('surname');

            if (error) throw error;
            return patients || [];
        } catch (error) {
            console.error('Error loading patients:', error);
            this.showNotification('Errore nel caricamento pazienti', 'error');
            return [];
        }
    }

    async savePatient(patientData) {
        try {
            const data = {
                ...patientData,
                doctor_id: window.currentDoctor.id  // Aggiungi doctor_id
            };

            const { error } = await supabase
                .from('patients')
                .upsert(data);

            if (error) throw error;
            this.showNotification('Paziente salvato con successo', 'success');
            await this.renderPatientsList();
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Errore durante il salvataggio', 'error');
        }
    }

    async saveDiagnosis(diagnosisData) {
        try {
            const { error } = await supabase
                .from('diagnosi')
                .upsert({
                    id: diagnosisData.id,
                    paziente_id: diagnosisData.paziente_id,
                    titolo: diagnosisData.titolo,
                    descrizione: diagnosisData.descrizione,
                    data: diagnosisData.data
                });

            if (error) throw error;
            this.showNotification('Diagnosi salvata', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Errore durante il salvataggio della diagnosi', 'error');
        }
    }

    async saveVisit(visitData) {
        try {
            const { error } = await supabase
                .from('visite')
                .insert({
                    paziente_id: visitData.paziente_id,
                    note: visitData.note,
                    data: visitData.data
                });

            if (error) throw error;
            this.showNotification('Visita salvata', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Errore durante il salvataggio della visita', 'error');
        }
    }

    async saveDiagnosisChanges() {
        if (!this.currentPatient) return;

        const diagnoses = Array.from(document.querySelectorAll('.diagnosis-item')).map(item => {
            // Converti la data dal formato locale a ISO
            const localDate = item.querySelector('.diagnosis-date').textContent;
            const [day, month, year] = localDate.split('/');
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            return {
                paziente_id: this.currentPatient.id,
                doctor_id: window.currentDoctor.id,  // Aggiungi doctor_id
                titolo: item.querySelector('.diagnosis-title').value,
                descrizione: item.querySelector('.diagnosis-description').value,
                data: isoDate
            };
        });

        try {
            // Prima elimina tutte le diagnosi esistenti per questo dottore
            await supabase
                .from('diagnosi')
                .delete()
                .eq('paziente_id', this.currentPatient.id)
                .eq('doctor_id', window.currentDoctor.id);

            // Poi inserisci le nuove diagnosi
            if (diagnoses.length > 0) {
                const { error } = await supabase
                    .from('diagnosi')
                    .insert(diagnoses);

                if (error) throw error;
            }

            this.showNotification('Diagnosi salvate', 'success');
        } catch (error) {
            console.error('Error saving diagnoses:', error);
            this.showNotification('Errore durante il salvataggio', 'error');
        }
    }

    async loadDiagnoses(patientId) {
        try {
            const { data: diagnoses, error } = await supabase
                .from('diagnosi')
                .select('*')
                .eq('paziente_id', patientId)
                .eq('doctor_id', window.currentDoctor.id)  // Filtro per doctor_id
                .order('data', { ascending: false });

            if (error) throw error;

            const diagnosisList = document.querySelector('.diagnosis-list');
            if (diagnosisList && diagnoses) {
                diagnoses.forEach(diagnosis => {
                    this.addDiagnosis(diagnosisList, diagnosis);
                });
            }
        } catch (error) {
            console.error('Error loading diagnoses:', error);
            this.showNotification('Errore nel caricamento delle diagnosi', 'error');
        }
    }

    async saveClinicalData() {
        if (!this.currentPatient) return;

        try {
            const diagnoses = Array.from(document.querySelectorAll('.diagnosis-item')).map(item => ({
                paziente_id: this.currentPatient.id,
                doctor_id: window.currentDoctor.id,  // Aggiungi doctor_id
                titolo: item.querySelector('.diagnosis-title').value,
                descrizione: item.querySelector('.diagnosis-description').value,
                data: new Date().toISOString()
            }));

            // Elimina solo le diagnosi di questo dottore
            await supabase
                .from('diagnosi')
                .delete()
                .eq('paziente_id', this.currentPatient.id)
                .eq('doctor_id', window.currentDoctor.id);

            if (diagnoses.length > 0) {
                const { error } = await supabase
                    .from('diagnosi')
                    .insert(diagnoses);

                if (error) throw error;
            }

            this.showNotification('Diagnosi salvate con successo', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Errore durante il salvataggio', 'error');
        }
    }

    async loadAnamnesi(patientId) {
        try {
            const { data, error } = await supabase
                .from('anamnesi')
                .select('testo, updated_at')
                .eq('paziente_id', patientId)
                .eq('doctor_id', window.currentDoctor.id)
                .order('updated_at', { ascending: false })
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading anamnesi:', error);
                return;
            }

            const anamnesisTextarea = document.querySelector('#anamnesis');
            if (anamnesisTextarea) {
                anamnesisTextarea.value = data?.testo || '';
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Errore nel caricamento anamnesi', 'error');
        }
    }

    async saveAnamnesis() {
        if (!this.currentPatient) return;

        try {
            const anamnesiData = {
                paziente_id: this.currentPatient.id,
                doctor_id: window.currentDoctor.id,
                testo: document.querySelector('#anamnesis').value,
                updated_at: new Date().toISOString()
            };

            // Cerca un'anamnesi esistente
            const { data: existing } = await supabase
                .from('anamnesi')
                .select('id')
                .eq('paziente_id', this.currentPatient.id)
                .eq('doctor_id', window.currentDoctor.id)
                .single();

            let error;
            if (existing) {
                // Aggiorna esistente
                const { error: updateError } = await supabase
                    .from('anamnesi')
                    .update({ testo: anamnesiData.testo, updated_at: anamnesiData.updated_at })
                    .eq('id', existing.id);
                error = updateError;
            } else {
                // Inserisce nuova
                const { error: insertError } = await supabase
                    .from('anamnesi')
                    .insert([anamnesiData]);
                error = insertError;
            }

            if (error) throw error;
            this.showNotification('Anamnesi salvata con successo', 'success');
        } catch (error) {
            console.error('Error saving anamnesi:', error);
            this.showNotification('Errore nel salvataggio anamnesi', 'error');
        }
    }

    initializeDetailView() {
        // Gestione pulsanti esistenti
        const editInfoBtn = document.querySelector('.edit-info');
        const saveInfoBtn = document.querySelector('.save-info');
        const saveDiagnosisBtn = document.querySelector('.save-diagnosis');

        if (editInfoBtn) editInfoBtn.addEventListener('click', () => this.toggleInfoEdit(true));
        if (saveInfoBtn) saveInfoBtn.addEventListener('click', () => this.saveInfoChanges());
        if (saveDiagnosisBtn) saveDiagnosisBtn.addEventListener('click', () => this.saveClinicalData());

        // Aggiungi auto-save per anamnesi
        const anamnesisTextarea = document.querySelector('#anamnesis');
        if (anamnesisTextarea) {
            anamnesisTextarea.value = this.currentPatient.anamnesis || '';
            anamnesisTextarea.addEventListener('blur', () => this.saveAnamnesis());
        }
    }

    toggleInfoEdit(editable) {
        const inputs = document.querySelectorAll('#info input');
        inputs.forEach(input => {
            input.disabled = !editable;
        });

        const editButton = document.querySelector('.edit-info');
        const saveButton = document.querySelector('.save-info');
        
        if (editButton) editButton.style.display = editable ? 'none' : 'block';
        if (saveButton) saveButton.style.display = editable ? 'block' : 'none';
    }

    async saveInfoChanges() {
        if (!this.currentPatient || this.isSaving) return;
        this.isSaving = true; // Flag per prevenire salvataggi multipli

        try {
            const updateData = {
                birth_date: document.querySelector('#patient-birthdate').value,
                phone: document.querySelector('#patient-phone').value,
                email: document.querySelector('#patient-email').value,
            };

            const { error } = await supabase
                .from('patients')
                .update(updateData)
                .eq('id', this.currentPatient.id);

            if (error) throw error;

            // Aggiorna i dati locali senza ricaricare la pagina
            this.currentPatient = { ...this.currentPatient, ...updateData };
            
            // Disabilita i campi e aggiorna i pulsanti
            this.toggleInfoEdit(false);
            
            this.showNotification('Informazioni salvate con successo', 'success');
        } catch (error) {
            console.error('Error saving patient info:', error);
            this.showNotification('Errore durante il salvataggio', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    async saveAllChanges() {
        try {
            await this.saveInfoChanges();
            await this.saveDiagnosisChanges();
            await this.saveVisitsChanges();
            this.showNotification('Modifiche salvate con successo', 'success');
        } catch (error) {
            this.showNotification('Errore durante il salvataggio', 'error');
        }
    }

    async saveVisitsChanges() {
        if (!this.currentPatient) return;

        const visits = Array.from(document.querySelectorAll('.visit-item')).map(item => ({
            paziente_id: this.currentPatient.id,
            note: item.querySelector('.visit-notes').value,
            data: item.querySelector('.visit-date').textContent
        }));

        try {
            // Prima elimina tutte le visite esistenti
            await supabase
                .from('visite')
                .delete()
                .eq('paziente_id', this.currentPatient.id);

            // Poi inserisci le nuove visite
            if (visits.length > 0) {
                const { error } = await supabase
                    .from('visite')
                    .insert(visits);

                if (error) throw error;
            }

            this.showNotification('Visite salvate', 'success');
        } catch (error) {
            this.showNotification('Errore durante il salvataggio', 'error');
            console.error('Error:', error);
        }
    }

    async handleNewPatientSubmit(e) {
        e.preventDefault();
        const formData = {
            name: document.querySelector('#patient-name').value,
            surname: document.querySelector('#patient-surname').value,
            birth_date: document.querySelector('#patient-birthdate').value,
            phone: document.querySelector('#patient-phone').value,
            doctor_id: window.currentDoctor.id
        };

        try {
            const { error } = await supabase
                .from('patients')
                .insert(formData);

            if (error) throw error;

            this.showNotification('Paziente aggiunto con successo', 'success');
            this.closeNewPatientModal();
            await this.renderPatientsList();
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Errore durante il salvataggio', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    openNewPatientModal() {
        const template = document.getElementById('new-patient-modal');
        const clone = template.content.cloneNode(true);
        document.body.appendChild(clone);

        // Add form submit handler
        const form = document.querySelector('#patient-form');
        form.addEventListener('submit', (e) => this.handleNewPatientSubmit(e));
    }

    closeNewPatientModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
}

const patientManager = new PatientManager();
export { patientManager };
window.patientManager = patientManager;
window.openNewPatientModal = () => patientManager.openNewPatientModal();
window.closePatientModal = () => patientManager.closeNewPatientModal();
window.patientManager.saveVisitChanges = patientManager.saveVisitChanges.bind(patientManager);
window.patientManager.deleteVisit = patientManager.deleteVisit.bind(patientManager);
