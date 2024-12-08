const config = {
  API_URL: process.env.NODE_ENV === 'production'
    ? 'https://recipe-backend-786959629970.us-central1.run.app/api'
    : 'http://localhost:3001/api',
  PUBLIC_URL: '/recipe',
  USE_LOCAL_STORAGE: false,
};

export default config;
