# HireIQ Login Issues - Complete Fix Guide

## 🔍 Problem Analysis

Based on your error screenshot, you're experiencing:
1. **CORS (Cross-Origin Resource Sharing) errors**
2. **Google OAuth authentication failures**
3. **Network connectivity issues between frontend and backend**

## ✅ Solutions Applied

### 1. CORS Configuration Fixed
- Updated `settings_production.py` to allow your EC2 domain
- Added proper CORS headers for authentication
- Configured nginx to handle preflight requests

### 2. Google OAuth Configuration
- Updated production settings for OAuth2
- Added proper redirect URL handling
- Enhanced security settings for production

### 3. Environment Variables
- Created proper `.env` file with EC2-specific configuration
- Added CORS settings for your domain
- Configured frontend API URL correctly

### 4. Nginx Configuration
- Added CORS headers to nginx reverse proxy
- Proper handling of OPTIONS requests
- Enhanced proxy settings for authentication

## 🚀 Deployment Steps

### Step 1: Update Your Environment File
1. Edit the `.env` file in your project root
2. Replace placeholder values with your actual credentials:

```bash
# Critical values to update:
SECRET_KEY=your-actual-secret-key-50-characters-minimum
GOOGLE_OAUTH2_KEY=your-google-client-id
GOOGLE_OAUTH2_SECRET=your-google-client-secret
MONGO_PASSWORD=your-strong-mongo-password
REDIS_PASSWORD=your-strong-redis-password
```

### Step 2: Update Google OAuth Console
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Navigate to: **Credentials > OAuth 2.0 Client IDs**
3. Edit your OAuth client and add these **Authorized JavaScript origins**:
   ```
   http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com
   http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com:80
   ```
4. Add these **Authorized redirect URIs**:
   ```
   http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com/
   http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com/auth/login/google-oauth2/
   ```

### Step 3: Deploy the Fixes
On your EC2 instance, run:

```bash
# Make the script executable
chmod +x fix-login.sh

# Run the deployment script
./fix-login.sh
```

Or on Windows (if developing locally):
```powershell
.\fix-login.ps1
```

## 🔧 Manual Deployment Commands

If you prefer manual deployment:

```bash
# 1. Stop existing containers
docker-compose down

# 2. Remove old images
docker rmi hireiq-backend hireiq-frontend

# 3. Rebuild and start
docker-compose up -d --build

# 4. Check logs
docker-compose logs -f
```

## 🧪 Testing the Fix

### 1. Check Container Health
```bash
docker-compose ps
```

### 2. Test API Endpoints
```bash
# Test backend health
curl http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com:8000/api/health/

# Test CORS headers
curl -H "Origin: http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com:8000/api/auth/google/
```

### 3. Test Frontend
- Open: `http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com`
- Check browser console for errors
- Try Google login

## 🐛 Common Issues & Solutions

### Issue 1: Still Getting CORS Errors
**Solution:**
```bash
# Check if environment variables are loaded
docker-compose exec backend env | grep CORS

# Restart containers to reload env vars
docker-compose restart
```

### Issue 2: Google OAuth Still Failing
**Solution:**
1. Verify Google Console settings match exactly
2. Check environment variables:
```bash
docker-compose exec backend env | grep GOOGLE
```
3. Ensure no trailing spaces in .env file

### Issue 3: Containers Won't Start
**Solution:**
```bash
# Check logs for specific errors
docker-compose logs backend
docker-compose logs frontend

# Check if ports are available
netstat -tulpn | grep :8000
netstat -tulpn | grep :80
```

## 📊 Monitoring & Logs

### View Real-time Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Check Container Status
```bash
# List running containers
docker-compose ps

# Check resource usage
docker stats
```

## 🔒 Security Considerations

### Current Setup (HTTP)
- CORS is permissive for development
- SSL/HTTPS is disabled
- Suitable for testing

### For Production
1. Enable HTTPS:
   ```bash
   SECURE_SSL_REDIRECT=True
   SESSION_COOKIE_SECURE=True
   CSRF_COOKIE_SECURE=True
   ```
2. Restrict CORS origins
3. Use strong passwords
4. Enable firewall rules

## 📞 Need Help?

If issues persist:
1. Check the container logs
2. Verify Google OAuth console settings
3. Ensure .env file has correct values
4. Test API endpoints individually
5. Check EC2 security groups allow ports 80 and 8000

## 🎯 Expected Result

After following this guide:
- ✅ No CORS errors in browser console
- ✅ Google login button works
- ✅ Successful authentication flow
- ✅ Access to recruiter dashboard