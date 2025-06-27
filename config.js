// Google Sheets Configuration
// Replace these values with your actual Google Sheets information

const GOOGLE_SHEETS_CONFIG = {
    // Your Google Sheet ID (found in the URL between /d/ and /edit)
    // Example: https://docs.google.com/spreadsheets/d/1E_bMFSxC43FrQTP3CsT6n9sjOaSSTFr35hYu7K1ajr8/edit
    // Sheet ID would be: 1E_bMFSxC43FrQTP3CsT6n9sjOaSSTFr35hYu7K1ajr8
    sheetId: '1dphQesUqeB__8-qZUPyzzgNI0XzQXCzlTzOnQp8mzKg',
    
    // OAuth 2.0 Client ID (get this from Google Cloud Console)
    // Go to: https://console.cloud.google.com/apis/credentials
    // Create OAuth 2.0 Client ID for web application
    clientId: '765498920553-noac3ncbvt6qnm7tgrngp2qonj2cd1of.apps.googleusercontent.com',
    
    // API Key (optional fallback - keep for backup)
    apiKey: 'YOUR_API_KEY_HERE',
    
    // Sheet range (e.g., 'Sheet1!A:B' for columns A and B)
    // First column should be questions, second column should be answers
    range: 'Verb List Scales!A4:X70',
    
    // Use OAuth 2.0 instead of API key
    useOAuth: true
};

// Make configuration available globally
window.GOOGLE_SHEETS_CONFIG = GOOGLE_SHEETS_CONFIG;

// Export the configuration for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GOOGLE_SHEETS_CONFIG;
} 