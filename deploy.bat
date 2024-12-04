@echo off
echo Deploying new version to Google Cloud...
gcloud builds submit --tag gcr.io/conscious-cafe/recipe-calculator
gcloud run deploy recipe-calculator --image gcr.io/conscious-cafe/recipe-calculator --platform managed --region asia-south1 --allow-unauthenticated
echo Deployment complete!
