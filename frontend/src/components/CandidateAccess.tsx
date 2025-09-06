import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Candidate Access</h1>
          <p className="text-gray-600">Enter your candidate ID to continue</p>
        </div>
        
        <form onSubmit={validateCandidateId} className="space-y-6">
          <div>
            <label htmlFor="candidateId" className="block text-sm font-medium text-gray-700 mb-2">
              Candidate ID
            </label>
            <input
              type="text"
              id="candidateId"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="Enter your candidate ID"
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-3"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Validating...' : 'Access Portal'}
          </button>
        </form>
        
        {message && (
          <div className={`mt-4 p-3 rounded ${
            candidate 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}
        
        <div className="mt-8 text-center">
          <button 
            onClick={goBack}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Home
          </button>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Don't have a candidate ID? Contact your recruiter.</p>
        </div>
      </div>
    </div>
  );
};

export default CandidateAccess;
