import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import CandidatePortal from './CandidatePortal';

interface Candidate {
  id: number;
  candidate_id: string;
  email: string;
  created_at: string;
  is_active: boolean;
  resume_filename?: string;
  resume_content_type?: string;
  resume_size?: string;
  has_resume?: boolean;
}

const CandidateAccess: React.FC = () => {
  const [candidateId, setCandidateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  const validateCandidateId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_BASE_URL}/candidates/validate/`, {
        candidate_id: candidateId,
      });

      if (response.data.valid) {
        setCandidate(response.data.candidate);
        setMessage('Access granted! Welcome to the interview portal.');
      }
    } catch (error: any) {
      console.error('Validation failed:', error);
      if (error.response?.status === 404) {
        setMessage('Invalid candidate ID. Please check your ID and try again.');
      } else {
        setMessage('Something went wrong. Please try again later.');
      }
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate('/');
  };

  const handleLogout = () => {
    setCandidate(null);
    setCandidateId('');
    setMessage('');
  };

  const handleCandidateUpdate = (updatedCandidate: Candidate) => {
    setCandidate(updatedCandidate);
  };

  if (candidate) {
    return <CandidatePortal candidate={candidate} onLogout={handleLogout} onCandidateUpdate={handleCandidateUpdate} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-400/5 dark:to-purple-400/5"></div>
        <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 dark:from-blue-300/10 dark:to-indigo-300/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 dark:from-purple-300/10 dark:to-pink-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full border border-white/20 dark:border-gray-700/30">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 rounded-2xl shadow-lg">
              <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Candidate Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Enter your candidate ID to access your interview
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
        
        {/* Form */}
        <form onSubmit={validateCandidateId} className="space-y-6">
          <div>
            <label htmlFor="candidateId" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Candidate ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="candidateId"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                placeholder="Enter your unique candidate ID"
                className="w-full px-4 py-4 pl-12 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              This ID was provided by your recruiter
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 px-6 rounded-2xl hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Validating...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Access Portal
              </div>
            )}
          </button>
        </form>
        
        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-2xl border transition-colors duration-300 ${
            candidate 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            <div className="flex items-center">
              {candidate ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}
        
        {/* Back to Home */}
        <button 
          onClick={goBack}
          className="mt-8 w-full flex items-center justify-center px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200 group"
        >
          <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </button>
        
        {/* Help Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-center">
          <div className="flex justify-center mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
            Need Help?
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            Don't have a candidate ID? Contact your recruiter or check your email invitation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateAccess;
