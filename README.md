# Recipe Calculator App

A React-based recipe cost calculator application deployed on Google Cloud Run.

## Deployment Instructions

1. **Local Development**
```bash
npm install
npm start
```

2. **Deploy to Google Cloud**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/conscious-cafe/recipe-calculator
gcloud run deploy recipe-calculator --image gcr.io/conscious-cafe/recipe-calculator --platform managed --region asia-south1 --allow-unauthenticated
```

## Quick Deploy
Run `deploy.bat` to quickly build and deploy changes.

## Application URLs
- Production: https://recipe.consciouscafe.in
- Development: https://recipe-calculator-519715510696.asia-south1.run.app
