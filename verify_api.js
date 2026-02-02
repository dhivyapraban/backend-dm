const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';

const endpoints = [
    // Auth (Public)
    { method: 'POST', url: '/auth/register', label: 'Auth Register' },
    { method: 'POST', url: '/auth/login', label: 'Auth Login' },
    { method: 'POST', url: '/auth/verify-otp', label: 'Auth Verify OTP' },
    { method: 'POST', url: '/auth/refresh-token', label: 'Auth Refresh Token' },
    
    // Auth (Protected)
    { method: 'GET', url: '/auth/profile', label: 'Auth Profile' },

    // Dashboard
    { method: 'GET', url: '/dashboard/stats', label: 'Dashboard Stats' },
    { method: 'GET', url: '/dashboard/activity', label: 'Dashboard Activity' },
    { method: 'GET', url: '/dashboard/live-tracking', label: 'Dashboard Live Tracking (Mobile)' },
    { method: 'GET', url: '/dashboard/live-tracking-web', label: 'Dashboard Live Tracking (Web)' },
    { method: 'GET', url: '/dashboard/recent-absorptions', label: 'Dashboard Recent Absorptions' },

    // Drivers
    { method: 'GET', url: '/drivers', label: 'Get All Drivers' },
    { method: 'POST', url: '/drivers', label: 'Create Driver' },
    
    // E-Way Bills
    { method: 'GET', url: '/eway-bills', label: 'Get E-Way Bills' },
    { method: 'GET', url: '/eway-bills/stats', label: 'Get E-Way Bills Stats' },
    { method: 'POST', url: '/eway-bills', label: 'Create E-Way Bill' },

    // Packages
    { method: 'GET', url: '/packages/history', label: 'Package History (Mobile)' },
    { method: 'GET', url: '/packages/history-web', label: 'Package History (Web)' },

    // Deliveries
    { method: 'POST', url: '/deliveries/create', label: 'Create Delivery (Public)' },
    { method: 'GET', url: '/deliveries/assigned', label: 'Assigned Deliveries' },

    // Absorption
    { method: 'GET', url: '/absorption/map-data', label: 'Absorption Map Data' },
    { method: 'GET', url: '/absorption/active', label: 'Absorption Active' },
    
    // Virtual Hubs
    { method: 'GET', url: '/virtual-hubs', label: 'Virtual Hubs List' },
];

async function checkEndpoints() {
    let output = '# API Verification Results (With JSON Body)\n\n';
    console.log('Checking API Endpoints...');

    for (const ep of endpoints) {
        try {
            const config = {
                method: ep.method,
                url: BASE_URL + ep.url,
                validateStatus: function (status) {
                    return status < 600; // Resolve all status codes
                }
            };
            
            const response = await axios(config);
            let statusLabel = 'Unknown';
            let icon = '❓';
            
            if (response.status >= 200 && response.status < 300) {
                statusLabel = 'Success';
                icon = '✅';
            } else if (response.status === 401 || response.status === 403) {
                statusLabel = 'Protected (Auth Required)';
                icon = '🔒';
            } else if (response.status === 400) {
                statusLabel = 'Bad Request (Endpoint Active)';
                icon = '⚠️';
            } else if (response.status === 404) {
                statusLabel = 'Not Found';
                icon = '❌';
            } else {
                statusLabel = `Error ${response.status}`;
                icon = '⚠️';
            }

            // Section Header
            output += `### ${icon} ${ep.label}\n`;
            output += `**Endpoint**: \`${ep.method} ${ep.url}\`\n`;
            output += `**Status**: ${response.status} (${statusLabel})\n`;

            // Display Body for GET requests if successful
            if (ep.method === 'GET' && response.status >= 200 && response.status < 300) {
                output += `**Response Body**:\n`;
                output += '```json\n';
                output += JSON.stringify(response.data, null, 2);
                output += '\n```\n';
            } else if (ep.method === 'POST') {
                output += `**Response**: ${statusLabel}\n`;
            }

            output += '---\n\n';

        } catch (error) {
             output += `### 🛑 ${ep.label}\n`;
             output += `**Endpoint**: \`${ep.method} ${ep.url}\`\n`;
             output += `**Error**: Network Error (${error.message})\n\n`;
        }
    }

    fs.writeFileSync(path.join(__dirname, 'api_verification_results.md'), output);
    console.log('Verification complete. Detailed results saved to api_verification_results.md');
}

checkEndpoints();
