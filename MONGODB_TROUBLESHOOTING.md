# MongoDB Atlas Troubleshooting Guide

## 🚨 Authentication Failed Error - Common Solutions

You're getting this error: `bad auth : authentication failed, full error: {'ok': 0, 'errmsg': 'bad auth : authentication failed', 'code': 8000, 'codeName': 'AtlasError'}`

### 1. 🔐 **Check Your Database User Credentials**

**Step 1**: Go to MongoDB Atlas Dashboard → Database Access
- Verify the username `ram321` exists
- If the user doesn't exist, create a new one:
  - Click "Add New Database User"
  - Choose "Password" authentication
  - Create username and password
  - Grant "Read and write to any database" privileges

**Step 2**: If the user exists, try resetting the password:
- Click "Edit" next to your user
- Click "Edit Password"
- Set a new password (avoid special characters for now)
- Click "Update User"

### 2. 🌐 **Check Network Access**

**Step 1**: Go to MongoDB Atlas Dashboard → Network Access
- Check if your IP address is whitelisted
- If not, click "Add IP Address"
- For testing, you can temporarily use "Allow Access from Anywhere" (0.0.0.0/0)
- **Important**: Restrict this in production!

### 3. 📝 **Verify Connection String Format**

Your current connection string format should be:
```
mongodb+srv://username:password@cluster0.mrmae.mongodb.net/databasename?retryWrites=true&w=majority
```

**Common Issues**:
- Missing database name in the URL
- Special characters in password need URL encoding
- Typos in cluster name

### 4. 🔧 **Quick Fix Checklist**

1. **Create a simple test user**:
   - Username: `testuser`
   - Password: `testpass123` (no special characters)
   - Permissions: "Read and write to any database"

2. **Update your .env file**:
   ```env
   MONGODB_URL=mongodb+srv://testuser:testpass123@cluster0.mrmae.mongodb.net/hireiq_db?retryWrites=true&w=majority
   ```

3. **Verify cluster name**: Make sure `cluster0.mrmae.mongodb.net` is correct
   - Go to Clusters → Connect → Connect your application
   - Copy the exact connection string provided

### 5. 🎯 **Next Steps**

1. **Login to MongoDB Atlas**: https://cloud.mongodb.com/
2. **Check Database Access**: Verify user exists and has correct permissions
3. **Check Network Access**: Ensure your IP is whitelisted
4. **Get fresh connection string**: Copy from Atlas dashboard
5. **Test with simple credentials**: Use alphanumeric username/password only

### 6. 📞 **Alternative Solution**

If you continue having issues, you can:
1. Delete the current database user
2. Create a new user with simple credentials
3. Get a fresh connection string from Atlas
4. Update your .env file

### 7. 🔍 **Debug Commands**

Run these to verify your connection:
```bash
# Test basic connectivity
nslookup cluster0.mrmae.mongodb.net

# Test with our script
python test_mongodb_connection.py
```

---

**Most Common Fix**: 
1. Go to Atlas → Database Access
2. Delete current user
3. Create new user: username=`hireiq_user`, password=`hireiq123`
4. Update .env: `MONGODB_URL=mongodb+srv://hireiq_user:hireiq123@cluster0.mrmae.mongodb.net/hireiq_db?retryWrites=true&w=majority`
