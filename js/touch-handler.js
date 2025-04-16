export class TouchHandler {
    constructor() {
        this.startX = 0;
        this.startY = 0;
        this.initTouchEvents();
    }

    initTouchEvents() {
        // Pull to refresh
        let touchStartY = 0;
        const mainContent = document.getElementById('main-content');

        mainContent.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        mainContent.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const distance = currentY - touchStartY;
            
            if (window.scrollY === 0 && distance > 50) {
                e.preventDefault();
                this.showRefreshIndicator();
            }
        });

        mainContent.addEventListener('touchend', (e) => {
            if (window.scrollY === 0) {
                this.refreshContent();
            }
        });

        // Swipe navigation
        document.addEventListener('touchstart', (e) => {
            this.startX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diff = this.startX - endX;

            if (Math.abs(diff) > 100) {
                if (diff > 0) {
                    // Swipe left
                    this.navigateNext();
                } else {
                    // Swipe right
                    this.navigatePrevious();
                }
            }
        });
    }

    showRefreshIndicator() {
        // Aggiungi indicatore di refresh
        const indicator = document.createElement('div');
        indicator.className = 'refresh-indicator';
        indicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
        document.body.appendChild(indicator);
    }

    refreshContent() {
        // Ricarica il contenuto corrente
        window.location.reload();
    }

    navigateNext() {
        // Implementa navigazione tra le sezioni
        const tabs = ['calendario', 'pazienti', 'impostazioni'];
        const currentTab = document.querySelector('.nav-item.active');
        const currentIndex = tabs.indexOf(currentTab?.dataset.page);
        if (currentIndex < tabs.length - 1) {
            document.querySelector(`[data-page="${tabs[currentIndex + 1]}"]`).click();
        }
    }

    navigatePrevious() {
        const tabs = ['calendario', 'pazienti', 'impostazioni'];
        const currentTab = document.querySelector('.nav-item.active');
        const currentIndex = tabs.indexOf(currentTab?.dataset.page);
        if (currentIndex > 0) {
            document.querySelector(`[data-page="${tabs[currentIndex - 1]}"]`).click();
        }
    }
}
