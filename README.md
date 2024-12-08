# Recipe Calculator App v2

A full-stack recipe cost calculator application with PostgreSQL backend, deployed on Google Cloud Run.

## 🔧 Technical Stack

- **Frontend**: React
- **Backend**: Node.js with Express
- **Database**: PostgreSQL 17.2
- **Deployment**: Google Cloud Run
- **State Management**: React Hooks
- **Styling**: CSS Grid, Flexbox
- **Authentication**: Session-based

## 🚀 Quick Start

1. **Database Setup**
```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE recipe_db;
```

2. **Environment Configuration**
```bash
# Copy example env file
cp server/.env.example server/.env
# Update with your database credentials
```

3. **Backend Setup**
```bash
cd server
npm install
node create-tables.js  # Initialize database schema
node server.js        # Start backend server
```

4. **Frontend Setup**
```bash
npm install
npm start
```

## 📊 Database Schema

### Recipes Table
```sql
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    preparation_steps TEXT,
    cooking_method TEXT,
    plating_instructions TEXT,
    chefs_notes TEXT,
    selling_price DECIMAL(10,2),
    monthly_sales INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ingredients Table
```sql
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    supplier VARCHAR(255),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Recipe_Ingredients Table
```sql
CREATE TABLE recipe_ingredients (
    recipe_id INTEGER REFERENCES recipes(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (recipe_id, ingredient_id)
);
```

## 🌟 Features

### Recipe Management
- Create and edit detailed recipes
- Standard Operating Procedure (SOP) sections
- Ingredient cost tracking
- Financial analytics

### Database Integration
- PostgreSQL for reliable data storage
- Transaction support for data integrity
- Efficient querying and data retrieval

### Security Features
- Environment-based configuration
- Session-based authentication
- Secure database connections

## 📁 Project Structure

```
project/
├── src/                  # Frontend React application
│   ├── components/       # React components
│   ├── styles/          # CSS styles
│   └── constants/       # Application constants
├── server/              # Backend Node.js application
│   ├── create-tables.js # Database schema setup
│   ├── server.js       # Express server
│   └── db.js           # Database configuration
└── public/             # Static assets
```

## 🔐 Environment Variables

Required environment variables in `.env`:
```
DB_USER=your_username
DB_HOST=localhost
DB_NAME=recipe_db
DB_PASSWORD=your_password
DB_PORT=5432
```

## 🌐 Deployment

1. **Local Development**
```bash
# Backend (Port 3001)
cd server && npm start

# Frontend (Port 3002)
npm start
```

2. **Google Cloud Run**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/conscious-cafe/recipe-calculator
gcloud run deploy recipe-calculator --image gcr.io/conscious-cafe/recipe-calculator --platform managed --region asia-south1 --allow-unauthenticated
```

## 📱 Application URLs
- Production: https://recipe.consciouscafe.in
- Development: https://recipe-calculator-519715510696.asia-south1.run.app

##  Google Cloud Deployment Guide

### Prerequisites
- Google Cloud Platform Account
- Google Cloud CLI installed
- Docker installed
- Access to Google Cloud Console

### 1. Project Setup
```bash
# Install Google Cloud CLI
# Windows
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe

# Initialize Google Cloud
gcloud init
```

### 2. Image Storage Setup
1. **Create a Storage Bucket**
```bash
# Create a new bucket
gsutil mb -l us-central1 gs://your-recipe-images-bucket

# Set bucket permissions
gsutil iam ch allUsers:objectViewer gs://your-recipe-images-bucket
```

2. **Update Image Storage Configuration**
When ready for deployment, update `env.js`:
```javascript
const config = {
  // ... other config
  CLOUD_STORAGE_BUCKET: 'your-recipe-images-bucket',
  CLOUD_STORAGE_URL: 'https://storage.googleapis.com/your-recipe-images-bucket'
};
```

### 3. Database Migration
1. **Create Cloud SQL Instance**
```bash
gcloud sql instances create recipe-db \
  --database-version=POSTGRES_17 \
  --tier=db-f1-micro \
  --region=us-central1
```

2. **Configure Database**
```bash
# Create database
gcloud sql databases create recipe_db --instance=recipe-db

# Set root password
gcloud sql users set-password postgres \
  --instance=recipe-db \
  --password=[YOUR_PASSWORD]
```

3. **Update Database Connection**
Create `.env.production`:
```env
DB_HOST=/cloudsql/[PROJECT_ID]:us-central1:recipe-db
DB_USER=postgres
DB_PASSWORD=[YOUR_PASSWORD]
DB_NAME=recipe_db
DB_PORT=5432
```

### 4. Frontend Deployment
1. **Build Production Assets**
```bash
# Install dependencies
npm install

# Build production bundle
npm run build
```

2. **Configure Nginx**
Update `nginx.conf`:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /recipe {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Backend Deployment
1. **Update Server Configuration**
Create `app.yaml`:
```yaml
runtime: nodejs18
env: flex

env_variables:
  NODE_ENV: "production"
  DB_HOST: "/cloudsql/[PROJECT_ID]:us-central1:recipe-db"
  DB_USER: "postgres"
  DB_NAME: "recipe_db"

beta_settings:
  cloud_sql_instances: "[PROJECT_ID]:us-central1:recipe-db"
```

2. **Deploy Backend**
```bash
gcloud app deploy
```

### 6. Security Considerations
1. **Set Up Cloud IAM**
- Create service accounts
- Configure minimal permissions
- Manage API keys

2. **Configure CORS**
Update `server.js`:
```javascript
const corsOptions = {
  origin: ['https://your-production-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
```

3. **Secure Secrets**
- Use Secret Manager for sensitive data
- Configure environment variables
- Implement proper authentication

### 7. Image Handling
1. **Configure Image Upload**
```javascript
// In your backend code
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('your-recipe-images-bucket');

const uploadImage = async (file) => {
  const blob = bucket.file(file.originalname);
  const blobStream = blob.createWriteStream();
  
  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });
    blobStream.end(file.buffer);
  });
};
```

2. **Update Frontend Image Handling**
```javascript
// In your React components
const handleImageUpload = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  const { imageUrl } = await response.json();
  return imageUrl;
};
```

### 8. Monitoring and Logging
1. **Set Up Cloud Monitoring**
- Configure custom metrics
- Set up alerts
- Monitor performance

2. **Configure Logging**
```javascript
// In your backend code
const { Logging } = require('@google-cloud/logging');
const logging = new Logging();
const log = logging.log('recipe-app-logs');

const logMetric = async (severity, message) => {
  const metadata = {
    severity: severity,
    resource: {
      type: 'gae_app',
      labels: {
        module_id: 'recipe-app'
      }
    }
  };
  
  const entry = log.entry(metadata, message);
  await log.write(entry);
};
```

### 9. Performance Optimization
1. **Configure CDN**
- Set up Cloud CDN
- Configure caching rules
- Optimize static assets

2. **Load Balancing**
- Configure load balancer
- Set up auto-scaling
- Configure health checks

### 10. Cost Management
1. **Set Up Budget Alerts**
```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Recipe App Budget" \
  --budget-amount=1000USD \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.75 \
  --threshold-rule=percent=0.9
```

2. **Monitor Resource Usage**
- Configure cost exports
- Set up billing alerts
- Monitor resource utilization

### 11. Backup and Recovery
1. **Database Backups**
```bash
# Configure automated backups
gcloud sql instances patch recipe-db \
  --backup-start-time=23:00 \
  --enable-bin-log
```

2. **Disaster Recovery**
- Configure point-in-time recovery
- Set up cross-region replication
- Test recovery procedures

### 12. CI/CD Pipeline
1. **Set Up Cloud Build**
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install']
  - name: 'gcr.io/cloud-builders/npm'
    args: ['run', 'build']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['app', 'deploy']
```

2. **Configure Automated Deployments**
- Set up build triggers
- Configure testing
- Implement rollback procedures

### 🔍 Common Issues and Solutions
1. **Database Connection Issues**
- Check connection string format
- Verify IP allowlist
- Check credentials

2. **Image Upload Problems**
- Verify bucket permissions
- Check file size limits
- Validate file types

3. **Performance Issues**
- Monitor server metrics
- Check database indexes
- Optimize queries

### 📝 Maintenance Tasks
1. Regular database backups
2. Monitor error logs
3. Update dependencies
4. Performance optimization
5. Security patches

### 🔐 Security Checklist
- [ ] Configure SSL/TLS
- [ ] Set up firewall rules
- [ ] Implement rate limiting
- [ ] Configure authentication
- [ ] Set up monitoring
- [ ] Enable audit logging

## 🔄 Version History

### v2.0.0
- Added PostgreSQL database integration
- Implemented proper authentication
- Removed sample data dependencies
- Added transaction support
- Enhanced error handling

### v1.0.0
- Initial release with basic functionality
- Local storage based data management

Always use React Name conventions