# HireIQ Docker Deployment Guide

This guide will help you deploy the HireIQ application on EC2 using Docker and Docker Compose.

## 📋 Prerequisites

- EC2 instance (t3.medium or larger recommended)
- Ubuntu 20.04 LTS or later
- At least 4GB RAM and 20GB storage
- Security groups configured to allow ports 80, 443, 8000, 22

## 🚀 Quick Deployment

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd HireIQ
   ```

2. **Make the deployment script executable:**
   ```bash
   chmod +x deploy.sh
   ```

3. **Run the deployment script:**
   ```bash
   sudo ./deploy.sh
   ```

## 🔧 Manual Deployment

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in to refresh group membership
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required environment variables:**
- `SECRET_KEY`: Django secret key
- `MONGO_USERNAME/MONGO_PASSWORD`: MongoDB credentials
- `GROQ_API_KEY`: For AI functionality
- `GOOGLE_OAUTH2_KEY/SECRET`: For Google authentication
- `ALLOWED_HOSTS`: Your domain/IP addresses

### Step 3: Deploy Services

```bash
# Build and start services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Initialize Database

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

## 🏗️ Architecture

The deployment includes:

- **Frontend**: React app served by Nginx
- **Backend**: Django REST API
- **Database**: MongoDB
- **Cache**: Redis
- **Reverse Proxy**: Nginx (optional, for production)

## 🔒 Security Configuration

### EC2 Security Group Rules

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Your IP | SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web traffic |
| Custom | TCP | 8000 | 0.0.0.0/0 | API access (optional) |

### Environment Security

1. **Change default passwords** in `.env`
2. **Use strong secrets** for all keys
3. **Enable firewall** on EC2
4. **Set up SSL certificates** for HTTPS

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check service health
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Check resource usage
docker stats
```

### Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Update single service
docker-compose up -d --no-deps [service-name]

# View logs
docker-compose logs -f [service-name]

# Execute commands in container
docker-compose exec backend python manage.py [command]
```

## 🔄 Backup and Recovery

### Database Backup

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --archive=/backup/backup-$(date +%Y%m%d).gz --gzip

# Restore MongoDB
docker-compose exec mongodb mongorestore --archive=/backup/backup-YYYYMMDD.gz --gzip
```

### File Backups

```bash
# Backup media files
docker-compose exec backend tar -czf /backup/media-$(date +%Y%m%d).tar.gz /app/media/

# Backup static files
docker-compose exec backend tar -czf /backup/static-$(date +%Y%m%d).tar.gz /app/static/
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   sudo lsof -i :80
   sudo kill -9 <PID>
   ```

2. **Permission denied:**
   ```bash
   sudo chown -R $USER:$USER .
   ```

3. **Out of disk space:**
   ```bash
   docker system prune -a
   ```

4. **Database connection issues:**
   - Check MongoDB logs: `docker-compose logs mongodb`
   - Verify credentials in `.env`
   - Ensure MongoDB is healthy: `docker-compose ps`

### Log Analysis

```bash
# Backend logs
docker-compose logs backend

# Database logs
docker-compose logs mongodb

# Frontend logs
docker-compose logs frontend

# All logs with timestamps
docker-compose logs -t
```

## 🔄 Updates and Scaling

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations if needed
docker-compose exec backend python manage.py migrate
```

### Scaling Services

```bash
# Scale backend service
docker-compose up -d --scale backend=3

# Scale with load balancer
docker-compose --profile production up -d
```

## 📞 Support

For issues and questions:
1. Check logs for error messages
2. Verify environment configuration
3. Ensure all required ports are open
4. Check EC2 instance resources (CPU, Memory, Disk)

## 🎯 Production Optimization

1. **Use external MongoDB Atlas** for better performance
2. **Set up CloudFront CDN** for static files
3. **Configure auto-scaling** with ELB
4. **Implement monitoring** with CloudWatch
5. **Set up automated backups** with AWS Backup
