#!/bin/bash

# HireIQ EC2 Deployment Script - Login Fix
# This script fixes the CORS and Google OAuth issues

echo "🚀 Starting HireIQ deployment fix..."

# Step 1: Update environment variables
echo "📝 Updating environment variables..."
cp .env .env

# Step 2: Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Step 3: Remove old images to force rebuild
echo "🗑️ Removing old images..."
docker rmi hireiq-backend hireiq-frontend 2>/dev/null || true

# Step 4: Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Step 5: Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Step 6: Check container status
echo "📊 Checking container status..."
docker-compose ps

# Step 7: Check logs for any errors
echo "📋 Checking backend logs..."
docker-compose logs backend | tail -20

echo "📋 Checking frontend logs..."
docker-compose logs frontend | tail -20

# Step 8: Test API health
echo "🔍 Testing API health..."
curl -f http://localhost:8000/api/health/ || echo "❌ Backend health check failed"

# Step 9: Test frontend
echo "🔍 Testing frontend..."
curl -f http://localhost/ || echo "❌ Frontend health check failed"

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your Google OAuth console:"
echo "   - Go to: https://console.developers.google.com/"
echo "   - Navigate to: Credentials > OAuth 2.0 Client IDs"
echo "   - Add authorized JavaScript origins:"
echo "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com"
echo "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com:80"
echo "   - Add authorized redirect URIs:"
echo "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com/auth/login/google-oauth2/"
echo "     * http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com/"
echo ""
echo "2. Update your .env file with actual credentials:"
echo "   - SECRET_KEY (generate a secure 50+ character string)"
echo "   - MONGO_PASSWORD (strong password)"
echo "   - REDIS_PASSWORD (strong password)"
echo "   - GOOGLE_OAUTH2_KEY (from Google Console)"
echo "   - GOOGLE_OAUTH2_SECRET (from Google Console)"
echo "   - GROQ_API_KEY (if using Groq AI)"
echo "   - GEMINI_API_KEY (if using Google Gemini)"
echo ""
echo "3. Re-run this script after updating credentials"