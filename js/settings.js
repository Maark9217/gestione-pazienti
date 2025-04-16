import { supabase } from './config.js';

export class SettingsManager {
    constructor() {
        this.currentSettings = null;
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const { data: settings } = await supabase
                .from('doctor_settings')
                .select('*')
                .eq('doctor_id', window.currentDoctor.id)
                .single();

            this.currentSettings = settings || {
                start_time: '09:00',
                end_time: '18:00',
                working_days: [1,2,3,4,5]
            };

            // Mostra gli orari attuali
            const scheduleInfo = document.createElement('div');
            scheduleInfo.className = 'current-schedule-info';
            scheduleInfo.innerHTML = `
                <div class="info-box">
                    <h4>Orario attuale:</h4>
                    <p>Dalle ${this.currentSettings.start_time} alle ${this.currentSettings.end_time}</p>
                    <p>Giorni: ${this.getWorkingDaysText(this.currentSettings.working_days)}</p>
                </div>
            `;

            const form = document.getElementById('working-hours-form');
            form.insertBefore(scheduleInfo, form.firstChild);

            // Popola il form con i valori attuali
            document.getElementById('start-time').value = this.currentSettings.start_time;
            document.getElementById('end-time').value = this.currentSettings.end_time;
            
            document.querySelectorAll('input[name="workingDays"]').forEach(checkbox => {
                checkbox.checked = this.currentSettings.working_days.includes(parseInt(checkbox.value));
            });

            document.getElementById('enable-notifications').checked = settings.notifications_enabled || false;
            document.getElementById('notification-time').value = settings.notification_time || '30';

            console.log('Impostazioni caricate:', settings); // Debug
        } catch (error) {
            console.error('Errore caricamento impostazioni:', error);
        }
    }

    getWorkingDaysText(days) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        return days.map(d => dayNames[d]).join(', ');
    }

    setupEventListeners() {
        document.getElementById('working-hours-form').onsubmit = (e) => this.saveWorkingHours(e);
        document.getElementById('enable-notifications').onchange = (e) => this.saveNotificationSettings();
        document.getElementById('notification-time').onchange = (e) => this.saveNotificationSettings();
        document.getElementById('export-data').onclick = () => this.exportData();
    }

    async saveWorkingHours(e) {
        e.preventDefault();
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const workingDays = Array.from(document.querySelectorAll('input[name="workingDays"]:checked'))
            .map(cb => parseInt(cb.value));

        try {
            const { error } = await supabase
                .from('doctor_settings')
                .upsert({
                    doctor_id: window.currentDoctor.id,
                    start_time: startTime,
                    end_time: endTime,
                    working_days: workingDays,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'doctor_id'
                });

            if (error) throw error;

            // Feedback visivo
            const form = document.getElementById('working-hours-form');
            const feedback = document.createElement('div');
            feedback.className = 'save-feedback success';
            feedback.textContent = 'Orari salvati con successo';
            form.appendChild(feedback);

            // Rimuovi il feedback dopo 3 secondi
            setTimeout(() => feedback.remove(), 3000);

            // Ricarica le impostazioni per conferma
            await this.loadSettings();

        } catch (error) {
            console.error('Errore salvataggio orari:', error);
            alert('Errore durante il salvataggio degli orari');
        }
    }

    async saveNotificationSettings() {
        try {
            const enabled = document.getElementById('enable-notifications').checked;
            const time = document.getElementById('notification-time').value;

            await supabase
                .from('doctor_settings')
                .update({
                    notifications_enabled: enabled,
                    notification_time: parseInt(time),
                    updated_at: new Date().toISOString()
                })
                .eq('doctor_id', window.currentDoctor.id);

        } catch (error) {
            console.error('Errore salvataggio impostazioni notifiche:', error);
            alert('Errore durante il salvataggio delle notifiche');
        }
    }

    async exportData() {
        try {
            const { data: appointments } = await supabase
                .from('appointments')
                .select(`
                    *,
                    patients (*)
                `)
                .eq('doctor_id', window.currentDoctor.id);

            const dataStr = JSON.stringify(appointments, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Errore esportazione dati:', error);
            alert('Errore durante l\'esportazione dei dati');
        }
    }
}

window.settingsManager = new SettingsManager();
