#!/bin/bash

# Health check script for HireIQ services
# Run this script to verify all services are running correctly

echo "🔍 HireIQ Health Check Report"
echo "============================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
else
    echo "✅ Docker is running"
fi

# Check if Docker Compose services are up
echo ""
echo "📊 Service Status:"
docker-compose ps

# Check individual service health
echo ""
echo "🔍 Individual Service Health:"

# Frontend health check
if curl -sf http://localhost/ >/dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is not responding"
fi

# Backend health check
if curl -sf http://localhost:8000/api/ >/dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API is not responding"
fi

# MongoDB health check
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "✅ MongoDB is healthy"
else
    echo "❌ MongoDB is not responding"
fi

# Redis health check
if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis is not responding"
fi

# Check disk usage
echo ""
echo "💾 Disk Usage:"
df -h /

# Check memory usage
echo ""
echo "🧠 Memory Usage:"
free -h

# Check Docker system usage
echo ""
echo "🐳 Docker System Usage:"
docker system df

# Show recent logs from all services
echo ""
echo "📝 Recent Error Logs (last 10 lines):"
docker-compose logs --tail=10 2>&1 | grep -i error || echo "No recent errors found"

echo ""
echo "Health check completed!"
