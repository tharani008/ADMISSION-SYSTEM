
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const runtimeApiUrl =
    (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_URL)
        ? window.APP_CONFIG.API_URL
        : null;

const config = {
    // Allow deploy-time override (Vite): VITE_API_URL="https://api.lasakedu.in"
    // NOTE: Call sites append `/api/...`, so API_URL should NOT include `/api`.
    API_URL: runtimeApiUrl
        ? runtimeApiUrl
        : ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
        ? import.meta.env.VITE_API_URL
        : (isLocalhost ? "http://localhost:5000" : "https://asia-south1-lasak-c1db5.cloudfunctions.net/api")),
    RAZORPAY_KEY_ID: "rzp_live_SI2BQMRDzBZa7n"
};


export default config;
