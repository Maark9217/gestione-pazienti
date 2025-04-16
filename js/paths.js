export const isGitHub = window.location.hostname.includes('github.io');
export const baseUrl = isGitHub ? '/gestione-pazienti' : '';

export function getPath(path) {
    return `${baseUrl}/${path}`.replace(/\/+/g, '/');
}
