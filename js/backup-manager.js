import { supabase } from './config.js';

export class BackupManager {
    constructor() {
        this.initBackupButton();
        this.initRestoreButton();
    }

    initBackupButton() {
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    initRestoreButton() {
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'btn-secondary';
        restoreBtn.innerHTML = '<i class="fas fa-upload"></i> Importa backup';
        restoreBtn.onclick = () => this.showRestoreDialog();
        
        document.getElementById('export-data').insertAdjacentElement('afterend', restoreBtn);
    }

    async exportData() {
        try {
            // Recupera tutti i dati
            const [patients, appointments, settings] = await Promise.all([
                this.getPatients(),
                this.getAppointments(),
                this.getSettings()
            ]);

            const backupData = {
                timestamp: new Date().toISOString(),
                doctor_id: window.currentDoctor.id,
                data: {
                    patients,
                    appointments,
                    settings
                }
            };

            // Crea e scarica il file
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Errore durante il backup:', error);
            alert('Errore durante la creazione del backup');
        }
    }

    showRestoreDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => this.handleFileUpload(e.target.files[0]);
        input.click();
    }

    async handleFileUpload(file) {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const backupData = JSON.parse(e.target.result);
                
                if (!this.validateBackup(backupData)) {
                    throw new Error('File di backup non valido');
                }

                if (confirm('Questo ripristinerà tutti i dati. Continuare?')) {
                    await this.restoreData(backupData.data);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Errore durante il ripristino:', error);
            alert('Errore durante il ripristino del backup');
        }
    }

    validateBackup(data) {
        return data && 
               data.timestamp && 
               data.doctor_id === window.currentDoctor.id &&
               data.data &&
               Array.isArray(data.data.patients) &&
               Array.isArray(data.data.appointments);
    }

    async restoreData(data) {
        try {
            // Elimina i dati esistenti
            await Promise.all([
                this.clearTable('appointments'),
                this.clearTable('patients')
            ]);

            // Ripristina i dati dal backup
            await Promise.all([
                this.restoreTable('patients', data.patients),
                this.restoreTable('appointments', data.appointments)
            ]);

            alert('Backup ripristinato con successo!');
            window.location.reload();
        } catch (error) {
            console.error('Errore durante il ripristino:', error);
            alert('Errore durante il ripristino dei dati');
        }
    }

    async clearTable(tableName) {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('doctor_id', window.currentDoctor.id);
        if (error) throw error;
    }

    async restoreTable(tableName, data) {
        const { error } = await supabase
            .from(tableName)
            .insert(data);
        if (error) throw error;
    }

    async getPatients() {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('doctor_id', window.currentDoctor.id);
        if (error) throw error;
        return data;
    }

    async getAppointments() {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', window.currentDoctor.id);
        if (error) throw error;
        return data;
    }

    async getSettings() {
        const { data, error } = await supabase
            .from('doctor_settings')
            .select('*')
            .eq('doctor_id', window.currentDoctor.id);
        if (error) throw error;
        return data;
    }
}
