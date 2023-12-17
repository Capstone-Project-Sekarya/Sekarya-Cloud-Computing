@echo off

@REM set GOOGLE_CLOUD_PROJECT=operating-ally-400608
set GOOGLE_CLOUD_PROJECT=digitalart-35c0a
set PROJECT_NAME=digitalart-ml-backend

CALL gcloud config^
    set project %GOOGLE_CLOUD_PROJECT%
CALL gcloud builds submit^
    --tag gcr.io/%GOOGLE_CLOUD_PROJECT%/%PROJECT_NAME%
CALL gcloud run deploy^
    %PROJECT_NAME%^
    --image gcr.io/%GOOGLE_CLOUD_PROJECT%/%PROJECT_NAME%^
    --platform=managed^
    --region=asia-southeast2^
    --allow-unauthenticated^
    --max-instances=1^
    --cpu-boost^
    --cpu=1^
    --memory=4Gi^
    --timeout=5