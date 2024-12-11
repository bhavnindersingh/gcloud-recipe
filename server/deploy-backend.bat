@echo off
gcloud run deploy recipe-backend ^
--image gcr.io/conscious-cafe-recipe-2024/recipe-backend ^
--platform managed ^
--region us-central1 ^
--allow-unauthenticated ^
--timeout 300 ^
--memory 1Gi ^
--cpu 1 ^
--min-instances 1 ^
--service-account recipe-storage-sa@conscious-cafe-recipe-2024.iam.gserviceaccount.com ^
--execution-environment gen2 ^
--port 8080 ^
--update-env-vars DB_USER=postgres,DB_PASSWORD=ConsciousCafe2024!,DB_NAME=recipe_db,CLOUD_SQL_CONNECTION_NAME=conscious-cafe-recipe-2024:us-central1:recipe-db,NODE_ENV=production,STORAGE_BUCKET=conscious-cafe-recipe-2024-uploads
