#!/bin/bash
# Complete HireIQ Setup and Fix Script for EC2

set -e  # Exit on any error

echo "🚀 HireIQ Complete Setup and Fix Script"
echo "========================================"

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

# Step 3: Setup environment
echo "📝 Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.ec2 .env
    echo "⚠️  IMPORTANT: You need to edit .env file with your actual credentials!"
    echo "   Run: nano .env"
    echo "   Update: SECRET_KEY, GOOGLE_OAUTH2_KEY, GOOGLE_OAUTH2_SECRET, passwords"
fi

# Step 4: Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Step 5: Clean up old images
echo "🧹 Cleaning up old images..."
docker rmi hireiq-backend hireiq-frontend 2>/dev/null || true

# Step 6: Start database services first
echo "🗄️  Starting database services..."
docker-compose up -d mongodb redis

# Wait for databases to be ready
echo "⏳ Waiting for databases to initialize..."
sleep 15

# Check if MongoDB is ready
echo "🔍 Checking MongoDB connection..."
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" || echo "MongoDB still starting..."

# Step 7: Run migrations to fix database tables
echo "🔧 Running Django migrations..."
docker-compose run --rm backend python manage.py migrate

# Step 8: Collect static files
echo "📦 Collecting static files..."
docker-compose run --rm backend python manage.py collectstatic --noinput

# Step 9: Start all services
echo "🚀 Starting all services..."
docker-compose up -d

# Step 10: Wait for services to be ready
echo "⏳ Waiting for all services to start..."
sleep 20

# Step 11: Check status
echo "📊 Checking service status..."
docker-compose ps

# Step 12: Test health endpoints
echo "🩺 Testing health endpoints..."
echo "Backend health check:"
curl -f http://localhost:8000/api/health/ || echo "❌ Backend not ready yet"

echo "Frontend check:"
curl -f http://localhost/ || echo "❌ Frontend not ready yet"

# Step 13: Show logs if there are issues
echo "📋 Recent logs:"
echo "Backend logs:"
docker-compose logs --tail=10 backend

echo "Frontend logs:"
docker-compose logs --tail=10 frontend

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔧 If you see 'no such table' errors, the .env file needs to be configured."
echo "📝 Edit .env file: nano .env"
echo "🔄 Then restart: docker-compose restart"
echo ""
echo "🌐 Access your app at: http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com"