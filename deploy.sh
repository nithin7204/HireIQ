#!/bin/bash

# HireIQ Production Deployment Script for EC2
# Make sure to run this script as root or with sudo privileges

set -e

echo "🚀 Starting HireIQ deployment on EC2..."

# Update system packages
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create application directory
APP_DIR="/opt/hireiq"
mkdir -p $APP_DIR
cd $APP_DIR

# Set up environment file
echo "⚙️  Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "❗ Please edit the .env file with your production values before continuing!"
    echo "Press any key to continue after editing .env file..."
    read -n 1
fi

# Set proper permissions
chown -R $USER:$USER $APP_DIR
chmod +x deploy.sh

# Start services
echo "🏃 Starting HireIQ services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 30

# Run database migrations
echo "🗃️  Running database migrations..."
docker-compose exec backend python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
docker-compose exec backend python manage.py collectstatic --noinput

# Check service status
echo "✅ Checking service status..."
docker-compose ps

# Show logs
echo "📊 Recent logs:"
docker-compose logs --tail=20

echo "🎉 HireIQ deployment completed!"
echo ""
echo "📋 Service URLs:"
echo "  Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "  API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/api"
echo "  Admin: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/admin"
echo ""
echo "⚠️  Important reminders:"
echo "  1. Update your EC2 Security Group to allow ports 80, 443, 8000"
echo "  2. Configure your domain DNS to point to this EC2 instance"
echo "  3. Set up SSL certificates for HTTPS"
echo "  4. Configure backup strategy for MongoDB data"
echo ""
echo "📖 To view logs: docker-compose logs -f"
echo "🔄 To restart: docker-compose restart"
echo "🛑 To stop: docker-compose down"
