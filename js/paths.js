const BASE_PATH = '/gestione-pazienti';

export function getPath(path) {
    // Se siamo in development, non aggiungere il base path
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return path;
    }
    
    // In produzione, aggiungi il base path
    return `${BASE_PATH}/${path}`;
}
