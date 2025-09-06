import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">HireIQ</h1>
          <p className="text-gray-600">Recruiter-Interviewee Portal</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => navigate('/recruiter')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
          >
            I'm a Recruiter
          </button>
          
          <button
            onClick={() => navigate('/candidate')}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition duration-200 font-medium"
          >
            I'm a Candidate
          </button>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Select your role to continue</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
