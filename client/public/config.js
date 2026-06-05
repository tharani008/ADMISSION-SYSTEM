const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.APP_CONFIG = {
    // Hostinger serves only the frontend. Backend runs on Firebase Functions.
    // This must be the function base URL (function name is `api`), because app code calls `${API_URL}/api/...`.
    API_URL: isLocalhost ? "http://localhost:5000" : "https://asia-south1-lasak-c1db5.cloudfunctions.net/api"
};
