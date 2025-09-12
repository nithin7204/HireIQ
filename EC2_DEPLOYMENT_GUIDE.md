# HireIQ AWS EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the HireIQ application on AWS EC2.

## Prerequisites

- AWS Account with EC2 access
- Basic knowledge of Linux/Ubuntu commands
- SSH client (PuTTY for Windows, Terminal for Mac/Linux)

## Step 1: Launch EC2 Instance

### 1.1 Choose AMI
- Go to AWS Console → EC2 → Launch Instance
- Select **Ubuntu Server 22.04 LTS (HVM)**
- Architecture: 64-bit (x86)

### 1.2 Choose Instance Type
- **Minimum**: t3.large (2 vCPU, 8 GB RAM) - **Recommended**
- t2.medium (2 vCPU, 4 GB RAM) - May work but could be tight
- **Note**: t2.micro (Free Tier) is NOT sufficient for this application

### 1.3 Configure Instance
- **Storage**: Minimum 30 GB, Recommended 50 GB GP3
- **Security Group**: Create new with these rules:
  ```
  Type            Protocol    Port Range    Source
  SSH             TCP         22            0.0.0.0/0
  HTTP            TCP         80            0.0.0.0/0
  HTTPS           TCP         443           0.0.0.0/0
  Custom TCP      TCP         8000          0.0.0.0/0
  Custom TCP      TCP         3000          0.0.0.0/0 (for dev)
  ```

### 1.4 Key Pair
- Create new key pair or use existing
- Download `.pem` file securely

## Step 2: Connect to EC2 Instance

### For Linux/Mac:
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### For Windows (using PuTTY):
1. Convert `.pem` to `.ppk` using PuTTYgen
2. Use PuTTY to connect with the `.ppk` file

## Step 3: Setup EC2 Environment

### 3.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 3.2 Install Required Packages
```bash
sudo apt install -y curl wget git htop vim unzip build-essential
```

### 3.3 Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker
```

### 3.4 Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3.5 Logout and Login Again
```bash
exit
# SSH back in to refresh group permissions
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 4: Deploy Application

### 4.1 Create Application Directory
```bash
sudo mkdir -p /opt/hireiq
sudo chown -R $USER:$USER /opt/hireiq
cd /opt/hireiq
```

### 4.2 Transfer Project Files

#### Option A: Using Git (Recommended)
```bash
git clone https://github.com/nithin7204/HireIQ.git .
```

#### Option B: Using SCP from Local Machine
```bash
# From your local machine
scp -i your-key.pem -r /path/to/HireIQ ubuntu@your-ec2-ip:/opt/hireiq/
```

### 4.3 Set Up Environment Variables
```bash
cd /opt/hireiq
cp backend/.env.example .env
nano .env
```

Update the following variables in `.env`:
```env
# Django Settings
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this
ALLOWED_HOSTS=your-ec2-public-ip,your-domain.com

# Database
MONGO_USERNAME=admin
MONGO_PASSWORD=secure-mongo-password
MONGO_DATABASE=hireiq_db

# Redis
REDIS_PASSWORD=secure-redis-password

# API Keys
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth
GOOGLE_OAUTH2_KEY=your-google-oauth-key
GOOGLE_OAUTH2_SECRET=your-google-oauth-secret
GOOGLE_CLIENT_ID=your-google-client-id

# Email Configuration
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend
FRONTEND_API_URL=http://your-ec2-public-ip:8000/api
```

### 4.4 Run Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

## Step 5: Verify Deployment

### 5.1 Check Container Status
```bash
docker-compose ps
```

### 5.2 Check Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5.3 Test Application
- Frontend: `http://your-ec2-public-ip`
- API: `http://your-ec2-public-ip:8000/api`
- Admin: `http://your-ec2-public-ip:8000/admin`

## Step 6: Post-Deployment Setup

### 6.1 Create Django Superuser
```bash
docker-compose exec backend python manage.py createsuperuser
```

### 6.2 Set Up SSL (Optional but Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### 6.3 Configure Domain (If using custom domain)
1. Update DNS A record to point to EC2 public IP
2. Update `ALLOWED_HOSTS` in `.env`
3. Restart containers: `docker-compose restart`

## Step 7: Monitoring & Maintenance

### 7.1 View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mongodb
```

### 7.2 Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### 7.3 Update Application
```bash
cd /opt/hireiq
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### 7.4 Backup Database
```bash
# Create backup
docker-compose exec mongodb mongodump --out /data/backup

# Copy backup to host
docker cp $(docker-compose ps -q mongodb):/data/backup ./mongodb_backup
```

## Troubleshooting

### Common Issues

1. **Container won't start**: Check logs with `docker-compose logs [service-name]`
2. **Out of memory**: Upgrade to larger instance type
3. **Permission denied**: Ensure proper file permissions with `sudo chown -R $USER:$USER /opt/hireiq`
4. **Port conflicts**: Ensure security group allows required ports
5. **Database connection issues**: Check MongoDB container is running and credentials are correct

### Resource Requirements

- **Minimum**: t3.large (2 vCPU, 8GB RAM, 30GB storage)
- **Recommended**: t3.xlarge (4 vCPU, 16GB RAM, 50GB storage)

### Cost Estimation (Monthly)

- t3.large: ~$60-80/month
- t3.xlarge: ~$120-150/month
- Storage (50GB): ~$5/month
- Data transfer: ~$10-20/month

**Total estimated cost: $75-175/month**

## Security Best Practices

1. **Firewall**: Use security groups to restrict access
2. **SSH Keys**: Never use password authentication
3. **SSL**: Always use HTTPS in production
4. **Environment Variables**: Never commit secrets to git
5. **Updates**: Regularly update system packages
6. **Backups**: Implement automated backup strategy

## Support

If you encounter issues:
1. Check application logs
2. Verify environment variables
3. Ensure all containers are running
4. Check AWS security group settings
5. Verify domain DNS settings (if applicable)