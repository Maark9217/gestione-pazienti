export const isGitHub = window.location.hostname.includes('github.io');
export const baseUrl = isGitHub ? '/gestione-pazienti' : '';

export function getPath(path) {
    const basePath = baseUrl || '';
    return `${basePath}/${path}`.replace(/\/+/g, '/');
}
