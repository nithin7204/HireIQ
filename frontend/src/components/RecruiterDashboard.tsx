import React, { useState, useEffect } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

// Function to get CSRF token from cookies
const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null;
};

interface Candidate {
  id: number;
  candidate_id: string;
  email: string;
  created_at: string;
  is_active: boolean;
  has_resume?: boolean;
  has_questions?: boolean;
  company?: string;
  role?: string;
  hr_prompt?: string;
  resume_filename?: string;
  interview_score?: number | null;
  evaluation_score?: string;
  evaluation_rating?: string;
  audio_responses_count?: number;
}

interface User {
  id: number;
  email: string;
  name: string;
}

const RecruiterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [hrPrompt, setHrPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [detailedReport, setDetailedReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  // Check if session has expired (24 hours timeout)
  const isSessionExpired = () => {
    const loginTime = localStorage.getItem('hireiq_login_time');
    if (!loginTime) return true;
    
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const currentTime = Date.now();
    const elapsedTime = currentTime - parseInt(loginTime);
    
    return elapsedTime > SESSION_TIMEOUT;
  };

  useEffect(() => {
    // First, try to restore user from localStorage
    const savedUser = localStorage.getItem('hireiq_user');
    const isLoggedIn = localStorage.getItem('hireiq_logged_in');
    
    if (savedUser && isLoggedIn === 'true' && !isSessionExpired()) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        console.log('Restored user session from localStorage:', userData.email);
        // Optionally verify the session is still valid
        checkAuth();
      } catch (error) {
        console.error('Failed to restore user from localStorage:', error);
        localStorage.removeItem('hireiq_user');
        localStorage.removeItem('hireiq_logged_in');
        localStorage.removeItem('hireiq_login_time');
        checkAuth();
      }
    } else if (isSessionExpired()) {
      console.log('Session has expired - clearing localStorage');
      localStorage.removeItem('hireiq_user');
      localStorage.removeItem('hireiq_logged_in');
      localStorage.removeItem('hireiq_login_time');
      checkAuth();
    } else {
      checkAuth();
    }
    
    // Get CSRF token from Django
    fetchCsrfToken();
    
    // Handle browser back/forward navigation - only logout if navigating away from recruiter
    const handlePopState = () => {
      // Only logout if we're actually navigating away from the recruiter dashboard
      if (!window.location.pathname.includes('/recruiter')) {
        console.log('Navigating away from recruiter dashboard - clearing auth state');
        handleFullLogout();
      }
    };
    
    const handleVisibilityChange = () => {
      // Don't do anything on visibility change - let user keep session active
      // Refreshing data on tab switch can cause unnecessary API calls and potential logout
      if (document.visibilityState === 'visible') {
        console.log('Page is visible again - session maintained');
        // Optional: Only refresh if user has been away for a long time
        // fetchCandidates();
      }
    };
    
    const handleBeforeUnload = () => {
      // Don't do anything on beforeunload - let user keep session
      console.log('User is switching tabs or minimizing - keeping session active');
    };
    
    window.addEventListener('popstate', handlePopState);
    // Removed visibility change listener to prevent tab switching issues
    // document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Helper function for complete logout
  const handleFullLogout = () => {
    try {
      googleLogout();
    } catch (error) {
      console.log('Google logout error (non-critical):', error);
    }
    setUser(null);
    setCandidates([]);
    setMessage('');
    setNewCandidateEmail('');
    setHrPrompt('');
    localStorage.clear();
    sessionStorage.clear();
  };

  const fetchCsrfToken = async () => {
    try {
      await axios.get(`${API_BASE_URL}/auth/csrf/`, {
        withCredentials: true,
      });
    } catch (error) {
      console.log('CSRF token fetch failed:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCandidates();
      
      // Set up auto-refresh and auto-evaluation for candidates with completed interviews
      const autoRefreshInterval = setInterval(async () => {
        // Fetch current candidates to check if any need evaluation updates
        try {
          const response = await axios.get(`${API_BASE_URL}/candidates/`, {
            withCredentials: true,
          });
          const currentCandidates = response.data;
          
          // Check for candidates that have completed interviews but don't have scores
          const candidatesNeedingEvaluation = currentCandidates.filter((c: any) => 
            c.has_questions && 
            c.audio_responses_count > 0 && 
            !c.interview_score
          );
          
          // Automatically trigger evaluation for candidates that need it
          for (const candidate of candidatesNeedingEvaluation) {
            try {
              console.log(`Auto-triggering evaluation for candidate: ${candidate.candidate_id}`);
              await triggerCandidateEvaluation(candidate.candidate_id);
            } catch (error) {
              console.error(`Failed to auto-evaluate candidate ${candidate.candidate_id}:`, error);
            }
          }
          
          // Update candidates list
          setCandidates(currentCandidates);
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }, 30000); // Check every 30 seconds for evaluation updates
      
      return () => clearInterval(autoRefreshInterval);
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/user/`, {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
        // Update localStorage with fresh user data
        localStorage.setItem('hireiq_user', JSON.stringify(response.data.user));
        localStorage.setItem('hireiq_logged_in', 'true');
        console.log('User authenticated:', response.data.user.email);
      } else {
        console.log('User not authenticated - session may have expired');
        // Clear localStorage if session is invalid
        localStorage.removeItem('hireiq_user');
        localStorage.removeItem('hireiq_logged_in');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed - network or server error:', error);
      // Don't clear localStorage on network errors, just log the error
      // The user can still try to re-authenticate manually
    }
  };

  const handleGoogleLogin = async (credentialResponse: any) => {
    try {
      console.log('Google credential response:', credentialResponse);
      
      const response = await axios.post(`${API_BASE_URL}/auth/google/`, {
        token: credentialResponse.credential,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Backend response:', response.data);

      if (response.data.success) {
        setUser(response.data.user);
        // Store user session in localStorage for persistence across tabs/refreshes
        localStorage.setItem('hireiq_user', JSON.stringify(response.data.user));
        localStorage.setItem('hireiq_logged_in', 'true');
        // Store login timestamp for session timeout handling
        localStorage.setItem('hireiq_login_time', Date.now().toString());
        setMessage('Successfully logged in!');
        // Clear any previous error messages
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error response:', error.response?.data);
      
      // Logout from Google OAuth if login fails
      googleLogout();
      setUser(null);
      
      if (error.response?.data?.error) {
        setMessage(`Login failed: ${error.response.data.error}`);
      } else {
        setMessage('Login failed. Please try again.');
      }
    }
  };

  const handleGoogleLoginError = () => {
    console.log('Google login error or cancelled by user');
    googleLogout();
    setUser(null);
    setMessage('Google login was cancelled or failed. Please try again.');
  };

  const fetchCandidates = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching candidates for user:', user.email);
      const response = await axios.get(`${API_BASE_URL}/candidates/`, {
        withCredentials: true,
      });
      console.log('Candidates response:', response.data);
      
      setCandidates(response.data);
    } catch (error: any) {
      console.error('Failed to fetch candidates:', error);
      if (error.response?.status === 401) {
        // Only clear user state if this was a deliberate action, not on background refresh
        console.log('401 error while fetching candidates - session may have expired');
        // Don't auto-logout, just show empty list
        setCandidates([]);
      }
    }
  };

  const triggerCandidateEvaluation = async (candidateId: string) => {
    try {
      console.log(`Triggering evaluation for candidate: ${candidateId}`);
      const response = await axios.post(`${API_BASE_URL}/candidates/manual-evaluate/`, {
        candidate_id: candidateId,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data.success) {
        console.log(`Evaluation completed for candidate: ${candidateId}`);
        // Refresh candidates to show updated scores
        await fetchCandidates();
      }
    } catch (error: any) {
      console.error(`Failed to evaluate candidate ${candidateId}:`, error);
      // Don't throw error - just log it so auto-evaluation doesn't stop
    }
  };

  const fetchDetailedReport = async (candidate: Candidate) => {
    setLoadingReport(true);
    setSelectedCandidate(candidate);
    setShowDetailedReport(true);
    
    try {
      console.log(`Fetching detailed report for candidate: ${candidate.candidate_id}`);
      const response = await axios.get(`${API_BASE_URL}/candidates/detailed-report/${candidate.candidate_id}/`, {
        withCredentials: true,
      });
      
      console.log('Detailed report response:', response.data);
      setDetailedReport(response.data);
    } catch (error: any) {
      console.error('Failed to fetch detailed report:', error);
      
      let errorMessage = 'Failed to fetch detailed report. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response error:', error.response.status, error.response.data);
        if (error.response.status === 404) {
          errorMessage = 'Candidate not found or no evaluation data available. Please run evaluation first.';
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Request error:', error.request);
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error:', error.message);
        errorMessage = `Request setup error: ${error.message}`;
      }
      
      setDetailedReport({
        error: errorMessage,
        candidate_info: candidate
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const closeDetailedReport = () => {
    setShowDetailedReport(false);
    setSelectedCandidate(null);
    setDetailedReport(null);
  };

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateEmail.trim() || !companyName.trim() || !roleName.trim()) {
      setMessage('❌ Please fill in all required fields (email, company name, and role).');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    // Check if THIS recruiter has already invited this candidate
    const existingCandidate = candidates.find(
      candidate => candidate.email.toLowerCase() === newCandidateEmail.trim().toLowerCase()
    );
    
    if (existingCandidate) {
      setMessage(`❌ You have already invited candidate "${newCandidateEmail}". Please check your candidates list.`);
      // Clear message after 6 seconds
      setTimeout(() => setMessage(''), 6000);
      return;
    }

    setLoading(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await axios.post(`${API_BASE_URL}/candidates/`, {
        email: newCandidateEmail,
        company: companyName.trim() || undefined,
        role: roleName.trim() || undefined,
        hr_prompt: hrPrompt.trim() || undefined,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRFToken': csrfToken })
        }
      });

      setCandidates([response.data, ...candidates]);
      setNewCandidateEmail('');
      setCompanyName('');
      setRoleName('');
      setHrPrompt('');
      setMessage('✅ Candidate added successfully! Email notification sent.');
      // Clear success message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Failed to add candidate:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add candidate';
      setMessage(`❌ ${errorMessage}`);
      // Clear error message after 8 seconds (longer for errors so user can read)
      setTimeout(() => setMessage(''), 8000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Initiating logout process');
      
      // First, logout from Google OAuth
      googleLogout();
      console.log('Google OAuth logout completed');
      
      // Then logout from Django backend
      await axios.post(`${API_BASE_URL}/auth/logout/`, {}, {
        withCredentials: true,
      });
      console.log('Backend logout completed');
      
    } catch (error) {
      console.error('Backend logout failed:', error);
    } finally {
      // Always clear frontend state regardless of backend response
      handleFullLogout();
      console.log('Full logout completed - redirecting to home');
      navigate('/', { replace: true }); // Use replace to prevent back navigation
    }
  };

  const downloadResume = (candidate: Candidate) => {
    const downloadUrl = `${API_BASE_URL}/candidates/download-resume/${candidate.candidate_id}/`;
    window.open(downloadUrl, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300 flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-400/5 dark:to-purple-400/5"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 dark:from-blue-300/10 dark:to-indigo-300/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 dark:from-purple-300/10 dark:to-pink-300/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full border border-white/20 dark:border-gray-700/30">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 rounded-2xl shadow-lg">
                <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-3">
              Recruiter Portal
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Sign in with Google to access your dashboard
            </p>
          </div>

          {/* Dark Mode Toggle */}
          <div className="absolute top-6 right-6">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Google Login */}
          <div className="flex justify-center mb-6">
            <div id="google-login-container" className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={handleGoogleLoginError}
                useOneTap={false}
                theme={isDarkMode ? "filled_black" : "outline"}
                size="large"
                shape="rectangular"
                width="280"
                auto_select={false}
                cancel_on_tap_outside={true}
                prompt_parent_id="google-login-container"
              />
            </div>
          </div>
          
          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl border transition-colors duration-300 ${
              message.includes('Successfully') 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <div className="flex items-center">
                {message.includes('Successfully') ? (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {message}
              </div>
            </div>
          )}
          
          {/* Info Box */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
              New to HireIQ? Registration will be completed automatically after Google sign-in. 
              Start managing candidates and AI-powered interviews right away!
            </p>
          </div>

          {/* Back to Home */}
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full flex items-center justify-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-5">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-lg shadow-md">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  HireIQ Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">AI-Powered Recruitment Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* User Info */}
              <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center ring-2 ring-blue-100 dark:ring-blue-800">
                  <span className="text-white font-semibold text-sm">{user.name?.charAt(0) || 'U'}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center space-x-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  <span className="text-sm font-medium">Home</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center space-x-2 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-6 sm:px-8 lg:px-12">
        {/* Alert Messages */}
        {message && (
          <div className={`mb-8 p-4 rounded-lg border transition-all duration-200 ${
            message.includes('✅') || message.includes('Successfully') || message.includes('successfully')
              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center">
              {message.includes('✅') || message.includes('Successfully') || message.includes('successfully') ? (
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium text-sm">{message}</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{candidates.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Candidates</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{candidates.filter(c => c.is_active).length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Active Candidates</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{candidates.filter(c => c.has_resume).length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Resumes Uploaded</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{candidates.filter(c => c.interview_score && c.interview_score > 0).length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">AI Interviews Done</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add New Candidate Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-8">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-3 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invite New Candidate</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send AI-powered interview invitation to candidates</p>
              </div>
            </div>
            
            <form onSubmit={addCandidate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="candidateEmail" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Candidate Email *
                  </label>
                  <input
                    id="candidateEmail"
                    type="email"
                    value={newCandidateEmail}
                    onChange={(e) => setNewCandidateEmail(e.target.value)}
                    placeholder="Enter candidate email"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </div>
                    ) : (
                      'Add Candidate'
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="roleName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Role/Position *
                  </label>
                  <input
                    type="text"
                    id="roleName"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Enter role/position"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="hrPrompt" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  HR Instructions (Optional)
                </label>
                <textarea
                  id="hrPrompt"
                  value={hrPrompt}
                  onChange={(e) => setHrPrompt(e.target.value)}
                  placeholder="Enter specific instructions for the interviewer AI (e.g., focus areas, skills to assess, company-specific requirements)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  These instructions will guide the AI interviewer to generate targeted questions for this candidate.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Candidates Management Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-3 shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Candidate Management</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monitor interview progress and candidate evaluations</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={fetchCandidates}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-2 border border-gray-200 dark:border-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span className="text-sm font-medium">Refresh</span>
                </button>
                <button
                  onClick={async () => {
                    setLoading(true);
                    setMessage('Refreshing candidate data...');
                    await fetchCandidates();
                    setLoading(false);
                    setMessage('Candidate data refreshed!');
                    setTimeout(() => setMessage(''), 3000);
                  }}
                  disabled={loading}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2 shadow-sm font-medium text-sm"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  )}
                  <span>{loading ? 'Refreshing...' : 'Update Data'}</span>
                </button>
                
                <button
                  onClick={async () => {
                    setLoading(true);
                    setMessage('Updating evaluation scores...');
                    
                    const candidatesNeedingEvaluation = candidates.filter(c => 
                      c.has_questions && 
                      c.audio_responses_count && 
                      c.audio_responses_count > 0
                    );
                    
                    console.log(`Updating scores for ${candidatesNeedingEvaluation.length} candidates`);
                    
                    for (const candidate of candidatesNeedingEvaluation) {
                      try {
                        await triggerCandidateEvaluation(candidate.candidate_id);
                      } catch (error) {
                        console.error(`Failed to evaluate ${candidate.candidate_id}:`, error);
                      }
                    }
                    
                    setLoading(false);
                    setMessage('Score updates completed!');
                    setTimeout(() => setMessage(''), 3000);
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span>{loading ? 'Updating...' : 'Update All Scores'}</span>
                </button>
              </div>
            </div>
            
            {candidates.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No candidates yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Get started by adding your first candidate above.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Candidate
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Company & Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Candidate ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Added On
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Resume
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Interview Score
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {candidates.map((candidate) => (
                        <tr key={candidate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">{candidate.email.charAt(0).toUpperCase()}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{candidate.email}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {candidate.is_active ? 'Active' : 'Inactive'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{candidate.company || 'N/A'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{candidate.role || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            {candidate.candidate_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(candidate.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {candidate.has_resume ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Uploaded
                                </span>
                                <button
                                  onClick={() => downloadResume(candidate)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-medium"
                                >
                                  Download
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold border ${
                              candidate.is_active 
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700' 
                                : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-1 ${candidate.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              {candidate.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              {candidate.interview_score !== null && candidate.interview_score !== undefined ? (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold border ${
                                      candidate.interview_score >= 80 ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700' :
                                      candidate.interview_score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' :
                                      'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
                                    }`}>
                                      {Math.round(candidate.interview_score)}/100
                                    </span>
                                    {candidate.evaluation_rating && (
                                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${
                                        candidate.evaluation_rating === 'Excellent' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' :
                                        candidate.evaluation_rating === 'Good' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' :
                                        candidate.evaluation_rating === 'Average' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' :
                                        'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
                                      }`}>
                                        {candidate.evaluation_rating}
                                      </span>
                                    )}
                                  </div>
                                  {candidate.evaluation_score && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Raw: {candidate.evaluation_score}/10
                                    </span>
                                  )}
                                </>
                              ) : candidate.has_questions && candidate.audio_responses_count && candidate.audio_responses_count > 0 ? (
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                    Interview Completed
                                  </span>
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
                                    <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Evaluating...
                                  </span>
                                </div>
                              ) : candidate.has_questions ? (
                                <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-1 animate-pulse"></div>
                                  Interview In Progress
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                                  Not Started
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {candidate.has_resume && (
                                <button
                                  onClick={() => downloadResume(candidate)}
                                  className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                  title="Download candidate resume"
                                >
                                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.06-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                  </svg>
                                  <span>Resume</span>
                                </button>
                              )}
                              
                              {candidate.interview_score && candidate.interview_score > 0 && (
                                <button
                                  onClick={() => fetchDetailedReport(candidate)}
                                  className="inline-flex items-center px-3 py-2 border border-purple-300 dark:border-purple-600 text-xs font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200"
                                  title="View detailed AI evaluation report"
                                >
                                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.593v-1.5a2.25 2.25 0 0 1 2.25-2.25h9v2.25a2.25 2.25 0 0 1-2.25 2.25H8.25ZM8.25 21h8.25" />
                                  </svg>
                                  <span>AI Report</span>
                                </button>
                              )}
                              
                              {candidate.has_questions && 
                               candidate.audio_responses_count && 
                               candidate.audio_responses_count > 0 && 
                               (!candidate.interview_score || candidate.interview_score === null) && (
                                <button
                                  onClick={() => triggerCandidateEvaluation(candidate.candidate_id)}
                                  className="inline-flex items-center px-3 py-2 border border-green-300 dark:border-green-600 text-xs font-medium rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                                  title="Generate AI evaluation score for this candidate"
                                >
                                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                  </svg>
                                  <span>Evaluate</span>
                                </button>
                              )}
                              
                              {candidate.interview_score && candidate.interview_score > 0 && (
                                <button
                                  onClick={() => triggerCandidateEvaluation(candidate.candidate_id)}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                  title="Refresh evaluation score"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Refresh
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detailed Report Modal */}
      {showDetailedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={closeDetailedReport}></div>
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-3xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6 border border-white/20 dark:border-gray-700/30 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-2xl shadow-lg mr-4">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      AI Evaluation Report
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedCandidate?.email} • {selectedCandidate?.candidate_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDetailedReport}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-2xl p-2 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="max-h-96 overflow-y-auto">
                {loadingReport ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Generating Detailed Report
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Our AI is analyzing the interview responses...
                      </p>
                    </div>
                  </div>
                ) : detailedReport ? (
                  <div className="space-y-6">
                    {detailedReport.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-6 text-center">
                        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Report Error</h3>
                        <p className="text-red-600 dark:text-red-400">{detailedReport.error}</p>
                      </div>
                    ) : (
                      <>
                        {/* Overall Score Card */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-2">Overall Assessment</h3>
                              <p className="text-blue-600 dark:text-blue-400">
                                {detailedReport.evaluation_rating || 'Not Available'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold text-blue-800 dark:text-blue-300">
                                {detailedReport.interview_score ? Math.round(detailedReport.interview_score) : 'N/A'}/100
                              </div>
                              <p className="text-sm text-blue-600 dark:text-blue-400">Total Score</p>
                            </div>
                          </div>
                        </div>

                        {/* Evaluation Summary */}
                        {detailedReport.evaluation_summary && (
                          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              AI Evaluation Summary
                            </h3>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                {detailedReport.evaluation_summary}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Technical Skills Breakdown */}
                        {detailedReport.technical_skills && (
                          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Technical Skills Assessment
                            </h3>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                {detailedReport.technical_skills}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Strengths and Improvements */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {detailedReport.strengths && (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-700">
                              <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Key Strengths
                              </h3>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-green-700 dark:text-green-400 leading-relaxed whitespace-pre-wrap">
                                  {detailedReport.strengths}
                                </p>
                              </div>
                            </div>
                          )}

                          {detailedReport.improvements && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-700">
                              <h3 className="text-lg font-bold text-orange-800 dark:text-orange-300 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Areas for Improvement
                              </h3>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-orange-700 dark:text-orange-400 leading-relaxed whitespace-pre-wrap">
                                  {detailedReport.improvements}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interview Responses */}
                        {detailedReport.responses && detailedReport.responses.length > 0 && (
                          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Interview Responses Summary
                            </h3>
                            <div className="space-y-4">
                              {detailedReport.responses.map((response: any, index: number) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                    Question {index + 1}:
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
                                    {response.question}
                                  </p>
                                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    {response.transcribed_text || 'Response recorded but transcription not available'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeDetailedReport}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;
