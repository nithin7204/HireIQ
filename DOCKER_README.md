# HireIQ - Docker Configuration Files

This repository contains all the necessary Docker configuration files for deploying the HireIQ application on EC2 or any other Docker-supported platform.

## 📁 Files Created

### Core Docker Files
- `Dockerfile` (Backend) - Django application containerization
- `frontend/Dockerfile` - React application containerization  
- `docker-compose.yml` - Main production configuration
- `docker-compose.dev.yml` - Development environment override

### Configuration Files
- `.env.example` - Environment variables template
- `mongo-init.js` - MongoDB initialization script
- `nginx/nginx.conf` - Nginx main configuration
- `nginx/conf.d/default.conf` - Nginx server configuration
- `frontend/nginx.conf` - Frontend Nginx configuration

### Deployment Scripts
- `deploy.sh` - Automated deployment script for EC2
- `health-check.sh` - Health monitoring script
- `backup.sh` - Backup automation script

### Documentation
- `DEPLOYMENT.md` - Comprehensive deployment guide

## 🚀 Quick Start

1. **Clone and configure:**
   ```bash
   git clone <your-repo>
   cd HireIQ
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Deploy on EC2:**
   ```bash
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

3. **Or manual deployment:**
   ```bash
   docker-compose up -d --build
   ```

## 🔧 Environment Variables

Key variables to configure in `.env`:

```env
# Security
SECRET_KEY=your-secret-key
DEBUG=False

# Database
MONGO_USERNAME=admin
MONGO_PASSWORD=secure-password
MONGODB_URL=mongodb://user:pass@host:port/db

# API Keys
GROQ_API_KEY=your-groq-key
GOOGLE_OAUTH2_KEY=your-google-client-id

# Domain
ALLOWED_HOSTS=your-domain.com,your-ec2-ip
```

## 🏗️ Services Architecture

- **Frontend** (Port 80): React + Nginx
- **Backend** (Port 8000): Django + REST API
- **Database** (Port 27017): MongoDB
- **Cache** (Port 6379): Redis
- **Proxy** (Port 8080): Nginx (production profile)

## 📊 Monitoring

- Health checks at: `http://your-domain/api/health/`
- Service status: `docker-compose ps`
- Logs: `docker-compose logs -f`

## 🔄 Maintenance

```bash
# Backup
./backup.sh

# Health check  
./health-check.sh

# Update
git pull && docker-compose up -d --build

# Scale
docker-compose up -d --scale backend=3
```

## 🛡️ Security Features

- Non-root container users
- Security headers in Nginx
- Rate limiting
- SSL/HTTPS ready
- CORS properly configured
- Environment variable isolation

## 📱 Mobile & Cross-Platform

The React frontend is fully responsive and works on:
- Desktop browsers
- Mobile devices
- Tablets
- Progressive Web App (PWA) ready

## 🔍 Troubleshooting

Common issues and solutions are documented in `DEPLOYMENT.md`.

For support, check:
1. Service logs: `docker-compose logs [service]`
2. Health status: `./health-check.sh`
3. Resource usage: `docker stats`

## 📈 Performance

Optimized for production with:
- Multi-stage Docker builds
- Static file optimization
- Database indexing
- Redis caching
- Gzip compression
- Image optimization

## 🌐 Deployment Options

- **AWS EC2** (recommended)
- **DigitalOcean Droplets**
- **Google Cloud Compute Engine**
- **Azure Virtual Machines**
- **Local development**

Ready for cloud deployment with minimal configuration changes!
