# EC2 Server Commands - Run these in your SSH terminal

# Step 1: Navigate to your project directory
cd /path/to/your/HireIQ  # Replace with your actual path

# Step 2: Check current directory and git status
pwd
git status

# Step 3: Pull the latest changes from GitHub
git pull origin main

# Step 4: Check if .env file exists
ls -la .env*

# Step 5: Copy the environment template and edit it
cp .env.ec2 .env

# Step 6: Edit the .env file with your actual credentials
nano .env  # or use vi .env

# Step 7: Update these critical values in .env:
# SECRET_KEY=your-actual-secret-key-50-characters-minimum
# GOOGLE_OAUTH2_KEY=your-google-client-id
# GOOGLE_OAUTH2_SECRET=your-google-client-secret
# MONGO_PASSWORD=your-strong-mongo-password
# REDIS_PASSWORD=your-strong-redis-password

# Step 8: Make the deployment script executable
chmod +x fix-login.sh

# Step 9: Run the deployment script
./fix-login.sh

# Step 10: Check if containers are running
docker-compose ps

# Step 11: Check logs if needed
docker-compose logs backend
docker-compose logs frontend