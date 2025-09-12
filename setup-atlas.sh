#!/bin/bash
# HireIQ Setup Script for MongoDB Atlas (Cloud Database)

set -e  # Exit on any error

echo "🚀 HireIQ Setup with MongoDB Atlas"
echo "=================================="

# Step 1: Find or setup project
echo "📍 Finding/Setting up project directory..."
if [ ! -d "HireIQ" ]; then
    echo "📥 Cloning HireIQ from GitHub..."
    git clone https://github.com/nithin7204/HireIQ.git
fi

cd HireIQ

# Step 2: Get latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Step 3: Setup environment for MongoDB Atlas
echo "📝 Setting up environment for MongoDB Atlas..."
if [ ! -f ".env" ]; then
    cp .env.atlas .env
    echo "✅ Created .env file from MongoDB Atlas template"
else
    echo "⚠️  .env file already exists"
fi

echo ""
echo "🔧 IMPORTANT: You need to update these values in .env:"
echo "   - SECRET_KEY (generate a secure 50+ character string)"
echo "   - GOOGLE_OAUTH2_KEY (from Google Console)"
echo "   - GOOGLE_OAUTH2_SECRET (from Google Console)"
echo "   - REDIS_PASSWORD (strong password for Redis)"
echo "   - API keys (GROQ_API_KEY, GEMINI_API_KEY) if needed"
echo ""
read -p "Press Enter to edit .env file now, or Ctrl+C to exit and edit manually..."
nano .env

# Step 4: Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Step 5: Clean up old images
echo "🧹 Cleaning up old images..."
docker rmi hireiq-backend hireiq-frontend 2>/dev/null || true

# Step 6: Use Atlas-specific docker-compose (no local MongoDB)
echo "🗄️  Using MongoDB Atlas configuration..."
cp docker-compose.atlas.yml docker-compose.yml

# Step 7: Start Redis first
echo "📦 Starting Redis..."
docker-compose up -d redis

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to initialize..."
sleep 10

# Step 8: Test MongoDB Atlas connection and run migrations
echo "🔧 Testing MongoDB Atlas connection and running migrations..."
docker-compose run --rm backend python manage.py migrate

# Step 9: Collect static files
echo "📦 Collecting static files..."
docker-compose run --rm backend python manage.py collectstatic --noinput

# Step 10: Start all services
echo "🚀 Starting all services..."
docker-compose up -d

# Step 11: Wait for services to be ready
echo "⏳ Waiting for all services to start..."
sleep 20

# Step 12: Check status
echo "📊 Checking service status..."
docker-compose ps

# Step 13: Test health endpoints
echo "🩺 Testing health endpoints..."
echo "Backend health check:"
curl -f http://localhost:8000/api/health/ || echo "❌ Backend not ready yet"

echo ""
echo "Frontend check:"
curl -f http://localhost/ || echo "❌ Frontend not ready yet"

# Step 14: Show recent logs
echo ""
echo "📋 Recent backend logs:"
docker-compose logs --tail=15 backend

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Configuration Summary:"
echo "   - Database: MongoDB Atlas (Cloud)"
echo "   - Cache: Local Redis container"
echo "   - Backend: Django + DRF"
echo "   - Frontend: React"
echo ""
echo "🌐 Access your app at: http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com"
echo ""
echo "🔧 If you see authentication errors:"
echo "   1. Update Google OAuth console with your EC2 domain"
echo "   2. Check GOOGLE_OAUTH2_KEY and GOOGLE_OAUTH2_SECRET in .env"
echo "   3. Restart services: docker-compose restart"