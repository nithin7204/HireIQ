import React, { useState, useEffect } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
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
  const [user, setUser] = useState<User | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [hrPrompt, setHrPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateEmail.trim()) return;

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Recruiter Login</h1>
            <p className="text-gray-600">Sign in with Google to continue</p>
          </div>
          
          <div className="flex justify-center mb-4">
            <div id="google-login-container">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={handleGoogleLoginError}
                useOneTap={false}
                theme="outline"
                size="large"
                shape="rectangular"
                width="300"
                auto_select={false}
                cancel_on_tap_outside={true}
                prompt_parent_id="google-login-container"
              />
            </div>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded ${
              message.includes('Successfully') 
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>New recruiter? Registration will be completed automatically after Google sign-in.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Recruiter Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.includes('✅') || message.includes('Successfully') || message.includes('successfully')
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Candidate</h2>
            <form onSubmit={addCandidate} className="space-y-4">
              <div className="flex space-x-4">
                <input
                  type="email"
                  value={newCandidateEmail}
                  onChange={(e) => setNewCandidateEmail(e.target.value)}
                  placeholder="Enter candidate email"
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Candidate'}
                </button>
              </div>
              <div>
                <label htmlFor="hrPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                  HR Instructions (Optional)
                </label>
                <textarea
                  id="hrPrompt"
                  value={hrPrompt}
                  onChange={(e) => setHrPrompt(e.target.value)}
                  placeholder="Enter specific instructions for the interviewer AI (e.g., focus areas, skills to assess, company-specific requirements)"
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  These instructions will guide the AI interviewer to generate targeted questions for this candidate.
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Candidates</h2>
              <div className="flex space-x-2">
                <button
                  onClick={fetchCandidates}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
                >
                  Refresh
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
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
                
                <button
                  onClick={async () => {
                    setLoading(true);
                    setMessage('Updating evaluation scores...');
                    
                    // Find candidates that need evaluation
                    const candidatesNeedingEvaluation = candidates.filter(c => 
                      c.has_questions && 
                      c.audio_responses_count && 
                      c.audio_responses_count > 0
                    );
                    
                    console.log(`Updating scores for ${candidatesNeedingEvaluation.length} candidates`);
                    
                    // Trigger evaluation for each candidate
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
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm disabled:opacity-50"
                >
                  {loading ? 'Updating Scores...' : 'Update All Scores'}
                </button>
              </div>
            </div>
            {candidates.length === 0 ? (
              <p className="text-gray-500">No candidates added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Candidate ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added On
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interview Score & Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {candidate.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {candidate.candidate_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(candidate.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {candidate.has_resume ? (
                            <div className="flex items-center">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Uploaded
                              </span>
                              <button
                                onClick={() => downloadResume(candidate)}
                                className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Download
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            candidate.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {candidate.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col space-y-1">
                            {candidate.interview_score !== null && candidate.interview_score !== undefined ? (
                              <>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    candidate.interview_score >= 80 ? 'bg-green-100 text-green-800' :
                                    candidate.interview_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {Math.round(candidate.interview_score)}/100
                                  </span>
                                  {candidate.evaluation_rating && (
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      candidate.evaluation_rating === 'Excellent' ? 'bg-green-50 text-green-700 border border-green-200' :
                                      candidate.evaluation_rating === 'Good' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                      candidate.evaluation_rating === 'Average' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                      'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                      {candidate.evaluation_rating}
                                    </span>
                                  )}
                                </div>
                                {candidate.evaluation_score && (
                                  <span className="text-xs text-gray-500">
                                    Raw: {candidate.evaluation_score}/10
                                  </span>
                                )}
                              </>
                            ) : candidate.has_questions && candidate.audio_responses_count && candidate.audio_responses_count > 0 ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Interview Completed
                                </span>
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                  Evaluating...
                                </span>
                              </div>
                            ) : candidate.has_questions ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Interview In Progress
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                                Not Started
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex space-x-2">
                            {candidate.has_resume ? (
                              <button
                                onClick={() => downloadResume(candidate)}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                              >
                                Download Resume
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500">No resume uploaded</span>
                            )}
                            
                            {/* Add evaluation button for candidates with completed interviews but no scores */}
                            {candidate.has_questions && 
                             candidate.audio_responses_count && 
                             candidate.audio_responses_count > 0 && 
                             (!candidate.interview_score || candidate.interview_score === null) && (
                              <button
                                onClick={() => triggerCandidateEvaluation(candidate.candidate_id)}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                title="Get evaluation score for this candidate"
                              >
                                Get Score
                              </button>
                            )}
                            
                            {/* Add refresh button for candidates with existing scores */}
                            {candidate.interview_score && candidate.interview_score > 0 && (
                              <button
                                onClick={() => triggerCandidateEvaluation(candidate.candidate_id)}
                                className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                                title="Refresh evaluation score"
                              >
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
