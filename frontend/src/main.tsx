import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useAuthStore } from './store/useAuthStore'

// Intercept all fetch requests to handle 401/403 responses globally
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    // If we get an authentication or authorization error, log the user out to force a new login
    if (response.status === 401 || response.status === 403) {
        // Prevent logging out if the request was to the login or register endpoint itself
        const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
        if (!url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
            useAuthStore.getState().logout();
        }
    }
    return response;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
