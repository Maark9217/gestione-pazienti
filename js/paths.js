export const isGitHubPages = window.location.hostname.includes('github.io');
export const BASE_PATH = isGitHubPages ? '/gestione-pazienti' : '';

export function getPath(path) {
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    return `${BASE_PATH}/${cleanPath}`;
}

export function redirectTo(path) {
    const fullPath = getPath(path);
    window.location.replace(fullPath);
}
