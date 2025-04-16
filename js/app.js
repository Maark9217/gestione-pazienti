import { supabase, getDoctorInfo } from './config.js'
import { Calendar } from './calendar.js'
import { TouchHandler } from './touch-handler.js';
import { NotificationManager } from './notifications.js';

// Rendi currentDoctor disponibile globalmente
window.currentDoctor = null;

// Controlla se l'utente è autenticato
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        window.location.href = '/login.html'
        return false
    }
    
    try {
        window.currentDoctor = await getDoctorInfo(session.user.id)
        updateDoctorUI()
        return true
    } catch (error) {
        console.error('Errore caricamento dottore:', error)
        window.location.href = '/login.html'
        return false
    }
}

// Aggiorna l'interfaccia utente con le informazioni del dottore
function updateDoctorUI() {
    const userInfo = document.getElementById('user-info')
    if (window.currentDoctor) {
        userInfo.innerHTML = `
            <div class="doctor-info">
                <span class="doctor-badge">
                    <i class="fas fa-user-md"></i>
                    Dr. ${window.currentDoctor.name} ${window.currentDoctor.surname}
                </span>
                <button onclick="window.logout()" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Esci
                </button>
            </div>
        `
    }
}

// Aggiungi controllo di sicurezza per le operazioni
window.checkDoctorAccess = (doctorId) => {
    return window.currentDoctor && window.currentDoctor.id === doctorId;
}

// Rendi logout disponibile globalmente
window.logout = async function() {
    await supabase.auth.signOut()
    window.location.href = '/login.html'
}

// Carica il template del calendario
function loadCalendario() {
    const template = document.getElementById('calendario-template')
    const mainContent = document.getElementById('main-content')
    mainContent.innerHTML = template.innerHTML
    initCalendar()
}

// Inizializza il calendario
function initCalendar() {
    const calendar = new Calendar()
}

// Carica il template dei pazienti
async function loadPazienti() {
    const mainContent = document.getElementById('main-content');
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'js/patients.js';
    
    // Rimuovi eventuali script precedenti
    const oldScript = document.querySelector('script[src="js/patients.js"]');
    if (oldScript) oldScript.remove();
    
    document.body.appendChild(script);
    
    // Attendiamo il caricamento dello script
    await new Promise(resolve => script.onload = resolve);
    
    // Il PatientManager si occuperà di renderizzare la lista
    if (window.patientManager) {
        await window.patientManager.loadPatients();
    }
}

window.showNewPatientModal = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Nuovo Paziente</h2>
            <form id="new-patient-form">
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" id="patient-name" required>
                </div>
                <div class="form-group">
                    <label>Cognome</label>
                    <input type="text" id="patient-surname" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="patient-email">
                </div>
                <div class="form-group">
                    <label>Telefono</label>
                    <input type="tel" id="patient-phone">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Annulla</button>
                    <button type="submit" class="btn-primary">Salva</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Gestione della navigazione
async function navigateTo(page) {
    switch(page) {
        case 'calendario':
            loadCalendario();
            break;
        case 'pazienti':
            await loadPazienti();
            break;
        case 'impostazioni':
            await loadImpostazioni();
            break;
    }
}

async function loadImpostazioni() {
    const mainContent = document.getElementById('main-content');
    const template = document.getElementById('settings-template');
    mainContent.innerHTML = template.innerHTML;

    // Carica il modulo delle impostazioni
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'js/settings.js';
    document.body.appendChild(script);

    // Aggiorna il pulsante attivo nel menu
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector('[data-page="impostazioni"]').classList.add('active');
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAuth()) {
        // Evidenzia il pulsante calendario
        document.querySelector('[data-page="calendario"]').classList.add('active')
        // Carica il calendario come vista predefinita
        loadCalendario()
    }
    new TouchHandler();

    // Inizializza il gestore delle notifiche dopo il login
    const notificationManager = new NotificationManager();
    window.notificationManager = notificationManager;
    
    // Aspetta il completamento del login prima di inizializzare le notifiche
    const checkLogin = setInterval(() => {
        if (window.currentDoctor) {
            notificationManager.init();
            clearInterval(checkLogin);
        }
    }, 1000);

    // Gestione impostazioni notifiche
    const enableNotificationsCheckbox = document.getElementById('enable-notifications');
    const notificationTimeSelect = document.getElementById('notification-time');

    enableNotificationsCheckbox?.addEventListener('change', async (e) => {
        await supabase.from('doctor_settings').upsert({
            doctor_id: window.currentDoctor.id,
            notifications_enabled: e.target.checked
        });
    });

    notificationTimeSelect?.addEventListener('change', async (e) => {
        await supabase.from('doctor_settings').upsert({
            doctor_id: window.currentDoctor.id,
            notification_time: parseInt(e.target.value)
        });
    });
})

// Eventi di navigazione
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'))
        e.currentTarget.classList.add('active')
        const page = e.currentTarget.dataset.page
        navigateTo(page)
    })
})
