import { supabase } from './config.js';

export class NotificationManager {
    constructor() {
        this.notifications = [];
        this.isDropdownOpen = false;
        this.initialized = false;
    }

    async init() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('Nessuna sessione attiva');
                return;
            }
            this.userId = session.user.id;
            
            await this.checkPermission();
            await this.loadNotifications();
            this.setupEventListeners();
            this.updateBadge();
        } catch (err) {
            console.error('Errore inizializzazione:', err);
        }
    }

    async checkPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    async loadNotifications() {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('doctor_id', this.userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Errore caricamento notifiche:', error);
                return;
            }

            this.notifications = data || [];
            this.updateBadge();
            this.renderNotifications();
        } catch (err) {
            console.error('Errore:', err);
        }
    }

    async loadSettings() {
        const { data: settings } = await supabase
            .from('doctor_settings')
            .select('*')
            .eq('doctor_id', this.userId)
            .single();

        if (settings) {
            document.getElementById('enable-notifications').checked = settings.notifications_enabled;
            document.getElementById('notification-time').value = settings.notification_time || '30';
        }
    }

    startCheckingAppointments() {
        setInterval(async () => {
            const { data: settings } = await supabase
                .from('doctor_settings')
                .select('notification_time, notifications_enabled')
                .eq('doctor_id', this.userId)
                .single();

            if (!settings?.notifications_enabled) return;

            const notificationTime = settings.notification_time || 30; // minuti
            const checkTime = new Date();
            checkTime.setMinutes(checkTime.getMinutes() + notificationTime);

            const { data: appointments } = await supabase
                .from('appointments')
                .select(`
                    *,
                    patients (name, surname)
                `)
                .eq('doctor_id', this.userId)
                .gte('date', new Date().toISOString())
                .lte('date', checkTime.toISOString())
                .is('notified', false);

            if (appointments?.length) {
                appointments.forEach(app => this.createAppointmentNotification(app));
            }
        }, 60000); // Controlla ogni minuto
    }

    async createAppointmentNotification(appointment) {
        const notificationData = {
            doctor_id: this.userId,
            type: 'appointment',
            title: 'Appuntamento imminente',
            message: `${appointment.patients.name} ${appointment.patients.surname} - ${new Date(appointment.date).toLocaleTimeString()}`,
            read: false,
            created_at: new Date().toISOString()
        };

        await supabase.from('notifications').insert(notificationData);
        await supabase.from('appointments')
            .update({ notified: true })
            .eq('id', appointment.id);

        this.showNotification(notificationData.title, notificationData.message);
        await this.loadNotifications();
    }

    showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        }
        this.updateBadge();
    }

    updateBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    renderNotifications() {
        const dropdown = document.querySelector('.notification-dropdown');
        if (!dropdown) return;

        const getNotificationIcon = (type) => {
            switch(type) {
                case 'appointment': return 'fa-calendar';
                case 'reminder': return 'fa-clock';
                case 'system': return 'fa-info-circle';
                default: return 'fa-bell';
            }
        };

        const notificationsHTML = this.notifications.length ? 
            this.notifications.map(notif => `
                <div class="notification-item ${!notif.read ? 'unread' : ''}" 
                     onclick="window.notificationManager.handleNotificationClick('${notif.id}', '${notif.type}')">
                    <div class="notification-icon">
                        <i class="fas ${getNotificationIcon(notif.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-header">
                            <h4>${notif.title}</h4>
                            <small>${this.formatTimeAgo(notif.created_at)}</small>
                        </div>
                        <p>${notif.message}</p>
                    </div>
                </div>
            `).join('') :
            '<div class="notification-item empty">Nessuna notifica</div>';

        dropdown.innerHTML = `
            <div class="notification-dropdown-header">
                <h3>Notifiche</h3>
                ${this.notifications.length ? 
                    '<button onclick="window.notificationManager.markAllAsRead()">Segna tutte come lette</button>' : 
                    ''}
            </div>
            <div class="notification-list">
                ${notificationsHTML}
            </div>
        `;
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Adesso';
        if (diffMins < 60) return `${diffMins}m fa`;
        if (diffHours < 24) return `${diffHours}h fa`;
        if (diffDays < 7) return `${diffDays}g fa`;
        return date.toLocaleDateString();
    }

    async handleNotificationClick(id, type) {
        await this.markAsRead(id);
        
        // Gestione click in base al tipo di notifica
        switch(type) {
            case 'appointment':
                // Naviga alla pagina del calendario
                document.querySelector('[data-page="calendario"]').click();
                break;
            // Aggiungi altri casi per diversi tipi di notifiche
        }
    }

    async markAsRead(notificationId) {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
        
        await this.loadNotifications();
    }

    async markAllAsRead() {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('doctor_id', this.userId);
        
        await this.loadNotifications();
    }

    setupEventListeners() {
        const bell = document.querySelector('.notification-bell');
        if (!bell) return;

        document.addEventListener('click', (e) => {
            if (bell.contains(e.target)) {
                this.toggleDropdown();
            } else if (!document.querySelector('.notification-dropdown')?.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        const dropdown = document.querySelector('.notification-dropdown');
        if (!dropdown) return;

        this.isDropdownOpen = !this.isDropdownOpen;
        dropdown.style.display = this.isDropdownOpen ? 'block' : 'none';
    }

    closeDropdown() {
        const dropdown = document.querySelector('.notification-dropdown');
        if (!dropdown) return;

        this.isDropdownOpen = false;
        dropdown.style.display = 'none';
    }

    async createTestNotifications() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Utente non autenticato');
                return;
            }

            const testNotifications = [
                {
                    doctor_id: session.user.id,
                    type: 'appointment',
                    title: 'Test Appuntamento',
                    message: 'Appuntamento di test con Mario Rossi',
                    read: false
                }
            ];

            console.log('Creazione notifica con:', testNotifications);

            const { data, error } = await supabase
                .from('notifications')
                .insert(testNotifications)
                .select();

            if (error) {
                console.error('Errore dettagliato:', error);
                alert(`Errore: ${error.message}`);
                return;
            }

            console.log('Notifica creata:', data);
            await this.loadNotifications();
            alert('Notifica di test creata con successo!');
        } catch (err) {
            console.error('Errore catch:', err);
            alert('Errore imprevisto');
        }
    }
}

window.notificationManager = new NotificationManager();
