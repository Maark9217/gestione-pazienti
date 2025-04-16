export function getPath(path) {
    // Rimuovi eventuali slash iniziali
    path = path.replace(/^\//, '');
    
    // Se siamo su GitHub Pages
    if (window.location.hostname.includes('github.io')) {
        return `/gestione-pazienti/${path}`;
    }
    
    // In ambiente locale
    return `/${path}`;
}
