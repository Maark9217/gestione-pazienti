const BASE_URL = window.location.hostname.includes('github.io') ? '/gestione-pazienti' : '';

export function getPath(path) {
    // Rimuovi eventuali slash iniziali e finali
    path = path.replace(/^\/|\/$/g, '');
    return `${BASE_URL}/${path}`.replace(/\/+/g, '/');
}

export function redirectTo(page) {
    window.location.href = getPath(page);
}
