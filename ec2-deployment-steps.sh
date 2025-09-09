#!/bin/bash

# Step-by-step deployment commands for EC2
echo "🚀 HireIQ EC2 Deployment - Step by Step Guide"
echo "=============================================="

echo "Step 1: System Update"
echo "Run these commands on your EC2 instance:"
echo ""
echo "sudo apt update && sudo apt upgrade -y"
echo ""

echo "Step 2: Install Git"
echo "sudo apt install git -y"
echo ""

echo "Step 3: Install Docker"
echo "curl -fsSL https://get.docker.com -o get-docker.sh"
echo "sudo sh get-docker.sh"
echo "sudo usermod -aG docker ubuntu"
echo ""

echo "Step 4: Install Docker Compose"
echo "sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
echo "sudo chmod +x /usr/local/bin/docker-compose"
echo ""

echo "Step 5: Clone Your Repository"
echo "git clone https://github.com/balaram-reddy-kolli/HireIQ.git"
echo "cd HireIQ"
echo ""

echo "Step 6: Configure Environment"
echo "cp .env.example .env"
echo "nano .env  # Edit with your values"
echo ""

echo "Step 7: Deploy Application"
echo "chmod +x deploy.sh"
echo "sudo ./deploy.sh"
echo ""

echo "📋 Important Notes:"
echo "- Make sure your EC2 Security Group allows ports 80, 443, 8000, 22"
echo "- Have your API keys ready (Groq, Google OAuth, etc.)"
echo "- Replace 'your-ec2-public-ip' with your actual EC2 IP in .env"
echo ""
