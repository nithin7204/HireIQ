import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import HomePage from './components/HomePage';
import RecruiterDashboard from './components/RecruiterDashboard';
import CandidateAccess from './components/CandidateAccess';
import './App.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function App() {
  console.log('Google Client ID:', GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
  
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Client ID is not set in environment variables');
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recruiter" element={<RecruiterDashboard />} />
            <Route path="/candidate" element={<CandidateAccess />} />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
