export class MobileHandler {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    }

    handleTouchStart(e) {
        const interactiveElements = [
            'button', 
            'input', 
            'textarea', 
            'select', 
            'a',
            '.nav-item',
            '.patient-card',
            '.appointment-card',
            '[role="button"]',
            '.days .day',            // Aggiungi elementi del calendario
            '.calendar-grid',
            '.weekdays',
            '.appointment',
            '#daily-appointments',
            '.calendar-header button'
        ];

        const isInteractive = e.target.closest(interactiveElements.join(', '));
        if (!isInteractive && !e.target.closest('#main-content')) {
            e.preventDefault();
        }
    }

    handleTouchMove(e) {
        if (e.target.closest('#main-content')) return;
        if (window.scrollY === 0 && e.touches[0].clientY > 0) {
            e.preventDefault();
        }
    }
}
