#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.production

# Project configuration
PROJECT_ID="conscious-cafe"
REGION="us-central1"
DB_INSTANCE="recipe-db"

echo "🚀 Starting deployment process..."

# 1. Enable required APIs
echo "📡 Enabling required APIs..."
gcloud services enable cloudsql.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 2. Create Cloud Storage bucket
echo "📦 Creating Cloud Storage bucket..."
gsutil mb -l $REGION gs://$STORAGE_BUCKET || true
gsutil iam ch allUsers:objectViewer gs://$STORAGE_BUCKET

# 3. Create Cloud SQL instance if it doesn't exist
echo "🗄️ Setting up Cloud SQL..."
gcloud sql instances create $DB_INSTANCE \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-size=10GB \
    --root-password=$DB_PASSWORD \
    || true

# Create database if it doesn't exist
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE || true

# 4. Store secrets in Secret Manager
echo "🔐 Storing secrets..."
printf "$DB_PASSWORD" | gcloud secrets create db-password --data-file=- || true
printf "$DB_USER" | gcloud secrets create db-user --data-file=- || true

# 5. Build and deploy backend
echo "🔨 Building and deploying backend..."
cd server
gcloud builds submit --tag gcr.io/$PROJECT_ID/recipe-backend
gcloud run deploy recipe-backend \
    --image gcr.io/$PROJECT_ID/recipe-backend \
    --platform managed \
    --region $REGION \
    --set-env-vars DB_USER=postgres \
    --set-env-vars POSTGRES_PASSWORD=ConsciousCafe2024! \
    --set-env-vars DB_NAME=recipe_db \
    --set-env-vars DB_HOST=34.172.94.190 \
    --set-env-vars NODE_ENV=production \
    --set-env-vars ALLOWED_ORIGINS=https://recipe.consciouscafe.in \
    --allow-unauthenticated

# Get the backend URL
BACKEND_URL=$(gcloud run services describe recipe-backend \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)')

# 6. Build and deploy frontend
echo "🎨 Building and deploying frontend..."
cd ../
echo "REACT_APP_API_URL=$BACKEND_URL" > .env.production
echo "REACT_APP_STORAGE_URL=https://storage.googleapis.com/$STORAGE_BUCKET" >> .env.production

gcloud builds submit --tag gcr.io/$PROJECT_ID/recipe-frontend
gcloud run deploy recipe-frontend \
    --image gcr.io/$PROJECT_ID/recipe-frontend \
    --platform managed \
    --region $REGION \
    --set-env-vars "REACT_APP_API_URL=$BACKEND_URL" \
    --set-env-vars "REACT_APP_STORAGE_URL=https://storage.googleapis.com/$STORAGE_BUCKET" \
    --allow-unauthenticated

echo "✅ Deployment completed!"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $(gcloud run services describe recipe-frontend --platform managed --region $REGION --format 'value(status.url)')"
