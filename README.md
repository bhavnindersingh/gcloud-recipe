# Recipe Manager Application

A full-stack recipe management application with local and cloud deployment capabilities.

## Production Configuration

### Deployment URLs
- Frontend: `https://recipe.consciouscafe.in`
- Backend: `https://recipe-backend-786959629970.us-central1.run.app`

## Deployment Configuration

### Backend Configuration (Cloud Run)

#### Environment Variables
```
DB_USER=postgres
POSTGRES_PASSWORD=ConsciousCafe2024!
DB_NAME=recipe_db
DB_HOST=34.172.94.190
NODE_ENV=production
ALLOWED_ORIGINS=https://recipe.consciouscafe.in
STORAGE_BUCKET=conscious-cafe-recipe-2024-uploads
```

#### Resource Configuration
- Memory: 1Gi
- CPU: 1
- Minimum Instances: 1
- Timeout: 300 seconds
- Port: 8080
- Execution Environment: gen2
- Service Account: recipe-storage-sa@conscious-cafe-recipe-2024.iam.gserviceaccount.com

#### CORS Configuration
- Allowed Origins: 
  - https://recipe.consciouscafe.in
  - http://localhost:3000 (development)
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization, Accept
- Exposed Headers: Content-Range, X-Content-Range
- Credentials: Enabled
- Max Age: 24 hours

### Frontend Configuration (Cloud Run)

#### Environment Variables
```
NODE_OPTIONS=--openssl-legacy-provider
REACT_APP_API_URL=https://recipe-backend-786959629970.us-central1.run.app
PUBLIC_URL=/recipe
```

#### Resource Configuration
- Memory: 1Gi
- CPU: 1
- Minimum Instances: 1
- Timeout: 300 seconds
- Port: 8080
- Execution Environment: gen2

#### Static Asset Configuration
- Base URL: /recipe
- Manifest Start URL: /recipe
- Assets served through API URL:
  - Logo: ${config.API_URL}/uploads/conscious-cafe-logo.svg
  - Icons: ${config.API_URL}/uploads/[icon-name].svg

### Security Configuration

#### Service Account Setup
1. Service Account Details:
   - Name: `recipe-storage-sa`
   - Email: `recipe-storage-sa@conscious-cafe-recipe-2024.iam.gserviceaccount.com`
   - Project ID: `conscious-cafe-recipe-2024`

2. Required Files:
   - Key File Location: `server/recipe-storage-sa-key.json`
   - Add to `.gitignore`:
     ```
     server/recipe-storage-sa-key.json
     ```

3. Storage Configuration:
   - Bucket Name: `conscious-cafe-recipe-2024-uploads`
   - Region: `us-central1`
   - Public Access: Enabled

### Deployment Process

#### Backend Deployment
1. Navigate to project directory
2. Run deployment script:
   ```batch
   deploy-backend-gcloud.bat
   ```
   This will:
   - Build and push container to Google Container Registry
   - Deploy to Cloud Run with specified configuration
   - Set all environment variables
   - Configure service account and resources

#### Frontend Deployment
1. Navigate to project directory
2. Run deployment script:
   ```batch
   deploy-frontend-gcloud.bat
   ```
   This will:
   - Set required environment variables
   - Build and push container
   - Deploy to Cloud Run with specified configuration
   - Configure static asset serving

### Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   # Backend
   cd server
   npm install

   # Frontend
   cd ../
   npm install
   ```

3. Set up environment variables:
   - Backend: Create `.env` file in server directory
   - Frontend: Create `.env` file in root directory

4. Start development servers:
   ```bash
   # Backend
   cd server
   npm run dev

   # Frontend
   cd ../
   npm start
   ```

### Troubleshooting

#### Common Issues
1. Static Asset 404/500 Errors
   - Verify PUBLIC_URL is set correctly
   - Check asset paths in App.js
   - Ensure assets are in correct location

2. CORS Issues
   - Verify ALLOWED_ORIGINS in backend configuration
   - Check frontend API_URL configuration
   - Ensure credentials handling is consistent

3. Database Connection Issues
   - Verify DB_HOST is accessible
   - Check database credentials
   - Ensure proper network configuration

### Monitoring and Maintenance

1. Cloud Run Monitoring
   - Check service logs for errors
   - Monitor resource usage
   - Review request latency

2. Database Maintenance
   - Regular backups
   - Performance monitoring
   - Connection pool management

3. Storage Management
   - Monitor bucket usage
   - Review access logs
   - Manage file retention

For additional support or configuration details, please contact the development team.