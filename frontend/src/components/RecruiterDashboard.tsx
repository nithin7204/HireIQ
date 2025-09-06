import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
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
}

interface User {
  id: number;
  email: string;
  name: string;
}

const RecruiterDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    checkAuth();
    // Get CSRF token from Django
    fetchCsrfToken();
  }, []);

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
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/user/`, {
        withCredentials: true,
      });
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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
        setMessage('Successfully logged in!');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data?.error) {
        setMessage(`Login failed: ${error.response.data.error}`);
      } else {
        setMessage('Login failed. Please try again.');
      }
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/candidates/`, {
        withCredentials: true,
      });
      setCandidates(response.data);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    }
  };

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateEmail.trim()) return;

    setLoading(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await axios.post(`${API_BASE_URL}/candidates/`, {
        email: newCandidateEmail,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRFToken': csrfToken })
        }
      });

      setCandidates([response.data, ...candidates]);
      setNewCandidateEmail('');
      setMessage('Candidate added successfully! Email sent.');
    } catch (error: any) {
      console.error('Failed to add candidate:', error);
      setMessage(error.response?.data?.error || 'Failed to add candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout/`, {}, {
        withCredentials: true,
      });
      setUser(null);
      setCandidates([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => {
                console.error('Google Login failed');
                setMessage('Google Login failed. Please try again.');
              }}
              useOneTap={false}
              theme="outline"
              size="large"
              shape="rectangular"
              width="300"
              auto_select={false}
              cancel_on_tap_outside={true}
            />
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
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Candidate</h2>
            <form onSubmit={addCandidate} className="flex space-x-4">
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
            </form>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Candidates</h2>
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
                        Status
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            candidate.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {candidate.is_active ? 'Active' : 'Inactive'}
                          </span>
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
