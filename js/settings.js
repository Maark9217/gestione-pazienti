import { supabase } from './config.js';
import { BackupManager } from './backup-manager.js';

export class SettingsManager {
    constructor() {
        this.currentSettings = null;
        this.backupManager = new BackupManager();
        this.init();
    }

    async init() {
        // Aspetta che il contenuto sia caricato prima di continuare
        await this.waitForContent();
        await this.loadSettings();
        this.setupEventListeners();
    }

    // Metodo per attendere che il contenuto sia caricato
    waitForContent() {
        return new Promise(resolve => {
            const check = () => {
                if (document.getElementById('working-hours-form')) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async loadSettings() {
        try {
            const { data: settings, error } = await supabase
                .from('doctor_settings')
                .select('*')
                .eq('doctor_id', window.currentDoctor.id)
                .single();

            if (error) throw error;

            this.currentSettings = settings || this.getDefaultSettings();
            this.updateUI();
        } catch (error) {
            console.error('Errore caricamento impostazioni:', error);
            this.currentSettings = this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            start_time: '09:00',
            end_time: '18:00',
            working_days: [1, 2, 3, 4, 5]
        };
    }

    updateUI() {
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

        document.getElementById('start-time').value = this.currentSettings.start_time;
        document.getElementById('end-time').value = this.currentSettings.end_time;

        document.querySelectorAll('input[name="workingDays"]').forEach(checkbox => {
            checkbox.checked = this.currentSettings.working_days.includes(parseInt(checkbox.value));
        });

        document.getElementById('enable-notifications').checked = this.currentSettings.notifications_enabled || false;
        document.getElementById('notification-time').value = this.currentSettings.notification_time || '30';

        console.log('Impostazioni caricate:', this.currentSettings); // Debug
    }

    getWorkingDaysText(days) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        return days.map(d => dayNames[d]).join(', ');
    }

    setupEventListeners() {
        const form = document.getElementById('working-hours-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.saveSettings();
        };

        document.getElementById('enable-notifications').onchange = (e) => this.saveNotificationSettings();
        document.getElementById('notification-time').onchange = (e) => this.saveNotificationSettings();
        document.getElementById('export-data').onclick = () => this.exportData();
    }

    async saveSettings() {
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

            const form = document.getElementById('working-hours-form');
            const feedback = document.createElement('div');
            feedback.className = 'save-feedback success';
            feedback.textContent = 'Orari salvati con successo';
            form.appendChild(feedback);

            setTimeout(() => feedback.remove(), 3000);

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

// Inizializza il gestore delle impostazioni solo quando siamo nella pagina corretta
if (window.location.hash === '#settings' || document.querySelector('.settings-container')) {
    window.settingsManager = new SettingsManager();
}
