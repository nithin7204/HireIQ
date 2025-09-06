# Google OAuth Setup Instructions

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Developers Console](https://console.developers.google.com/)
2. Create a new project or select an existing project
3. Enable the Google+ API or Google Identity API
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" > "OAuth 2.0 Client IDs"
6. Configure the OAuth consent screen if prompted
7. For Application type, select "Web application"
8. Add authorized JavaScript origins:
   - `http://localhost:3000` (React frontend)
   - `http://localhost:8000` (Django backend)
9. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:8000/auth/callback`
10. Copy the Client ID and Client Secret

## Step 2: Update Environment Files

Update `backend/.env`:
```
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
```

Update `frontend/.env`:
```
REACT_APP_GOOGLE_CLIENT_ID=your_actual_google_client_id_here
```

Make sure both files use the SAME Client ID.

## Step 3: Restart Services

After updating the environment files:
1. Restart the Django backend server
2. Restart the React frontend server
