# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas as the database for your HireIQ application.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account or log in if you already have one
3. Create a new project (e.g., "HireIQ")

## Step 2: Create a Cluster

1. Click "Create a Cluster"
2. Choose the **FREE** tier (M0 Sandbox)
3. Select your preferred cloud provider and region
4. Give your cluster a name (e.g., "hireiq-cluster")
5. Click "Create Cluster"

## Step 3: Configure Database Access

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Create a username and strong password
5. Under "Database User Privileges", select "Read and write to any database"
6. Click "Add User"

**Important**: Save these credentials - you'll need them for the connection string!

## Step 4: Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, restrict this to specific IP addresses
4. Click "Confirm"

## Step 5: Get Connection String

1. Go to "Clusters" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Python" as the driver and version "3.6 or later"
5. Copy the connection string

## Step 6: Update Your Environment Variables

1. Open `backend/.env` file
2. Replace the MongoDB URL with your Atlas connection string:

```env
# MongoDB Atlas Settings
MONGODB_NAME=hireiq_db
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/hireiq_db?retryWrites=true&w=majority
```

**Replace the placeholders:**
- `<username>`: Your database username
- `<password>`: Your database password
- `<cluster-name>`: Your cluster name (e.g., hireiq-cluster)

### Example:
```env
MONGODB_URL=mongodb+srv://hireiq_user:mypassword123@hireiq-cluster.abc123.mongodb.net/hireiq_db?retryWrites=true&w=majority
```

## Step 7: Test the Connection

1. Start your Django development server:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Check for any connection errors in the console

## Step 8: Run Migrations (if needed)

Since MongoDB is a NoSQL database and you're using djongo, traditional Django migrations work differently. However, you can still run:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## Troubleshooting

### Common Issues:

1. **Connection Timeout**: Make sure your IP address is whitelisted in Network Access
2. **Authentication Failed**: Verify your username and password in the connection string
3. **SSL/TLS Issues**: Ensure your connection string includes SSL parameters

### Additional Configuration for Production:

1. **Environment Variables**: Never commit your actual MongoDB credentials to version control
2. **IP Whitelisting**: Restrict network access to specific IP addresses
3. **Database User Permissions**: Use more restrictive permissions for production

## Security Best Practices

1. Use strong, unique passwords for database users
2. Regularly rotate database credentials
3. Monitor database access logs
4. Use VPC peering for enhanced security (paid tiers)
5. Enable database auditing (paid tiers)

## MongoDB Atlas Features

- **Free Tier Limits**: 512 MB storage, shared RAM and CPU
- **Automatic Backups**: Available on paid tiers
- **Performance Monitoring**: Built-in monitoring tools
- **Data Explorer**: Visual database browser
- **Charts**: Data visualization tools

Your HireIQ application is now configured to use MongoDB Atlas as the database!
