#!/bin/bash

# Quick EC2 Setup Script for HireIQ
# Run this on a fresh Ubuntu 22.04 EC2 instance

echo "🚀 HireIQ EC2 Quick Setup"
echo "=========================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essentials
echo "📦 Installing essential packages..."
sudo apt install -y curl wget git htop vim unzip build-essential

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/hireiq
sudo chown -R $USER:$USER /opt/hireiq

echo ""
echo "✅ Basic setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your HireIQ project files to /opt/hireiq/"
echo "2. Configure .env file"
echo "3. Run ./deploy.sh"
echo ""
echo "If using Git:"
echo "  cd /opt/hireiq"
echo "  git clone https://github.com/nithin7204/HireIQ.git ."
echo ""
echo "🔄 Please log out and log back in to refresh Docker permissions!"