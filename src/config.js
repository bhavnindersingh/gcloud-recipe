const isDevelopment = process.env.NODE_ENV === 'development';

const API_URL = isDevelopment 
  ? 'http://localhost:3001/api'
  : 'https://recipe-backend-786959629970.us-central1.run.app/api';

const config = {
    API_URL,
};

export default config;
