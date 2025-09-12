# HireIQ EC2 Deployment Script - Login Fix (PowerShell)
# This script fixes the CORS and Google OAuth issues

Write-Host "🚀 Starting HireIQ deployment fix..." -ForegroundColor Green

# Step 1: Update environment variables
Write-Host "📝 Updating environment variables..." -ForegroundColor Yellow
Copy-Item .env .env -Force

# Step 2: Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Step 3: Remove old images to force rebuild
Write-Host "🗑️ Removing old images..." -ForegroundColor Yellow
docker rmi hireiq-backend hireiq-frontend 2>$null

# Step 4: Build and start containers
Write-Host "🔨 Building and starting containers..." -ForegroundColor Yellow
docker-compose up -d --build

# Step 5: Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 6: Check container status
Write-Host "📊 Checking container status..." -ForegroundColor Yellow
docker-compose ps

# Step 7: Check logs for any errors
Write-Host "📋 Checking backend logs..." -ForegroundColor Yellow
docker-compose logs backend | Select-Object -Last 20

Write-Host "📋 Checking frontend logs..." -ForegroundColor Yellow
docker-compose logs frontend | Select-Object -Last 20

# Step 8: Test API health
Write-Host "🔍 Testing API health..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:8000/api/health/" -Method GET
    Write-Host "✅ Backend health check passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend health check failed" -ForegroundColor Red
}

# Step 9: Test frontend
Write-Host "🔍 Testing frontend..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost/" -Method GET
    Write-Host "✅ Frontend health check passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend health check failed" -ForegroundColor Red
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update your Google OAuth console:" -ForegroundColor White
Write-Host "   - Go to: https://console.developers.google.com/" -ForegroundColor Gray
Write-Host "   - Navigate to: Credentials > OAuth 2.0 Client IDs" -ForegroundColor Gray
Write-Host "   - Add authorized JavaScript origins:" -ForegroundColor Gray
Write-Host "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com" -ForegroundColor Gray
Write-Host "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com:80" -ForegroundColor Gray
Write-Host "   - Add authorized redirect URIs:" -ForegroundColor Gray
Write-Host "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com/auth/login/google-oauth2/" -ForegroundColor Gray
Write-Host "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com/" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update your .env file with actual credentials:" -ForegroundColor White
Write-Host "   - SECRET_KEY (generate a secure 50+ character string)" -ForegroundColor Gray
Write-Host "   - MONGO_PASSWORD (strong password)" -ForegroundColor Gray
Write-Host "   - REDIS_PASSWORD (strong password)" -ForegroundColor Gray
Write-Host "   - GOOGLE_OAUTH2_KEY (from Google Console)" -ForegroundColor Gray
Write-Host "   - GOOGLE_OAUTH2_SECRET (from Google Console)" -ForegroundColor Gray
Write-Host "   - GROQ_API_KEY (if using Groq AI)" -ForegroundColor Gray
Write-Host "   - GEMINI_API_KEY (if using Google Gemini)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Re-run this script after updating credentials" -ForegroundColor White