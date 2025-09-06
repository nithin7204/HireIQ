# HireIQ - Recruiter-Interviewee Portal

A full-stack web application that allows recruiters to manage candidates and provides a portal for candidates to access interviews using unique candidate IDs.

## Features

### Recruiter Portal
- Google OAuth authentication for recruiters
- Add candidate emails to the system
- Automatic generation of unique candidate IDs
- Email notifications sent to candidates with their IDs
- Dashboard to view and manage all candidates

### Candidate Portal
- Simple ID-based access system
- Candidates enter their unique ID to access the interview portal
- Validation against the database
- Access granted only for valid, active candidate IDs

## Tech Stack

### Frontend
- **React** with **TypeScript**
- **Vite** for build tooling
- **TailwindCSS** for styling
- **React Router DOM** for navigation
- **@react-oauth/google** for Google authentication
- **Axios** for API calls

### Backend
- **Django** with **Django REST Framework**
- **MongoDB Atlas** as the cloud database (using djongo)
- **social-auth-app-django** for Google OAuth
- **django-cors-headers** for CORS handling
- **django.core.mail** for email functionality

## Project Structure

```
HireIQ/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── HomePage.tsx
│   │   │   ├── RecruiterDashboard.tsx
│   │   │   └── CandidateAccess.tsx
│   │   ├── App.tsx         # Main app component
│   │   └── index.tsx       # Entry point
│   ├── package.json
│   └── .env                # Environment variables
├── backend/                 # Django application
│   ├── hireiq_backend/     # Main Django project
│   ├── candidates/         # Candidates app
│   ├── authentication/     # Authentication app
│   ├── manage.py
│   └── .env               # Environment variables
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Python (3.8 or higher)
- MongoDB Atlas account (free tier available)
- Google Cloud Console project with OAuth 2.0 credentials

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install django djangorestframework django-cors-headers python-dotenv pymongo djongo social-auth-app-django
   ```

4. Configure environment variables in `.env`:
   ```
   SECRET_KEY=your_django_secret_key
   DEBUG=True
   MONGODB_NAME=hireiq_db
   MONGODB_URL=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/hireiq_db?retryWrites=true&w=majority
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   EMAIL_HOST_USER=your_email@gmail.com
   EMAIL_HOST_PASSWORD=your_email_password
   
   # API Keys for ML Features
   GROQ_API_KEY=your_groq_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

   **Note**: 
   - For detailed MongoDB Atlas setup instructions, see `MONGODB_ATLAS_SETUP.md`
   - Copy `.env.example` to `.env` and fill in your actual values
   - The API keys are required for the interview question generation features

5. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. Create a superuser (optional):
   ```bash
   python manage.py createsuperuser
   ```

7. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```
   REACT_APP_API_URL=http://localhost:8000/api
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. Start the development server:
   ```bash
   npm start
   ```

### MongoDB Atlas Setup

1. Create a free MongoDB Atlas account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free M0 tier available)
3. Configure database access (create database user)
4. Configure network access (whitelist IP addresses)
5. Get your connection string
6. Update the `MONGODB_URL` in your `.env` file

For detailed step-by-step instructions, see `MONGODB_ATLAS_SETUP.md`

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000` (for frontend)
   - `http://localhost:8000/complete/google-oauth2/` (for backend)
6. Copy the Client ID and Client Secret to your environment files

## Usage

1. Start both backend and frontend servers
2. Navigate to `http://localhost:3000`
3. Choose "I'm a Recruiter" to access the recruiter portal
4. Sign in with Google
5. Add candidate emails - they will receive unique IDs via email
6. Candidates can use "I'm a Candidate" and enter their ID to access the portal

## API Endpoints

### Authentication
- `POST /api/auth/google/` - Google OAuth login
- `POST /api/auth/logout/` - Logout
- `GET /api/auth/user/` - Get current user info

### Candidates
- `GET /api/candidates/` - List all candidates (authenticated)
- `POST /api/candidates/` - Create new candidate (authenticated)
- `POST /api/candidates/validate/` - Validate candidate ID

## Environment Variables

### Backend (.env)
- `SECRET_KEY` - Django secret key
- `DEBUG` - Debug mode (True/False)
- `MONGODB_NAME` - MongoDB database name
- `MONGODB_URL` - MongoDB Atlas connection URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `EMAIL_HOST_USER` - Gmail address for sending emails
- `EMAIL_HOST_PASSWORD` - Gmail app password

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_GOOGLE_CLIENT_ID` - Google OAuth client ID

## Development Notes

- The application uses MongoDB Atlas with djongo for Django-MongoDB integration
- Google OAuth is implemented on both frontend and backend
- Email notifications are sent using Gmail SMTP
- CORS is configured to allow frontend-backend communication
- TailwindCSS is used for responsive design
- See `MONGODB_ATLAS_SETUP.md` for detailed database setup instructions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
