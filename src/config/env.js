const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const config = {
  API_URL: isLocalhost
    ? 'http://localhost:3001/api'
    : 'https://recipe-backend-786959629970.us-central1.run.app/api',
  STORAGE_URL: 'https://storage.googleapis.com/conscious-cafe-recipe-2024-uploads',
  ASSETS_URL: 'https://storage.googleapis.com/recipe.consciouscafe.in',
  PUBLIC_URL: '/',
  USE_LOCAL_STORAGE: true, // Enable local storage for better development experience
  IS_DEVELOPMENT: true, // Always enable development features for internal use
  MAX_FILE_SIZE: 10485760, // 10MB
  DEBUG: true // Enable debug logging
};

// Log configuration on startup
console.log('Running with config:', config);

export default config;
