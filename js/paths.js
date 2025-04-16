const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/gestione-pazienti' : '';

export function getPath(path) {
    return `${BASE_PATH}/${path}`.replace('//', '/');
}
