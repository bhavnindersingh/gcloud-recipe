const config = {
  API_URL: process.env.NODE_ENV === 'production'
    ? 'https://recipe-manager-app-2024.el.r.appspot.com/api'
    : 'http://localhost:3001/api',
  PUBLIC_URL: '/recipe',
  USE_LOCAL_STORAGE: false,
};

export default config;
