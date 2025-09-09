import React, { useState, useRef } from 'react';
import axios from 'axios';
import AudioInterview from './AudioInterview';
import { useTheme } from '../contexts/ThemeContext';

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
  has_questions?: boolean;
  interview_questions?: { [key: string]: string };
}

interface CandidatePortalProps {
  candidate: Candidate;
  onLogout: () => void;
  onCandidateUpdate: (updatedCandidate: Candidate) => void;
}

const CandidatePortal: React.FC<CandidatePortalProps> = ({ candidate, onLogout, onCandidateUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(!candidate.has_resume);
  const [showInterview, setShowInterview] = useState(false);
  const [checkingQuestions, setCheckingQuestions] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadMessage('Please select a PDF file only.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage('File size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
    selectedFileRef.current = file;
    setUploadMessage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const downloadResume = () => {
    const downloadUrl = `${API_BASE_URL}/candidates/download-resume/${candidate.candidate_id}/`;
    window.open(downloadUrl, '_blank');
  };

  const uploadResume = async () => {
    const fileToUpload = selectedFileRef.current;
    if (!fileToUpload) {
      setUploadMessage('Please select a file first.');
      return;
    }

    setUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('candidate_id', candidate.candidate_id);
    formData.append('resume', fileToUpload);

    try {
      console.log('Starting upload...', {
        candidateId: candidate.candidate_id,
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        apiUrl: `${API_BASE_URL}/candidates/upload-resume/`
      });
      
      const response = await axios.post(`${API_BASE_URL}/candidates/upload-resume/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response:', response.data);
      console.log('Setting success message...');
      setUploadMessage('Resume uploaded successfully! Updating your profile...');
      console.log('Success message set, clearing selected file...');
      removeSelectedFile();
      
      // Update candidate data with new resume info
      if (response.data.candidate) {
        console.log('Updating candidate data...', response.data.candidate);
        onCandidateUpdate(response.data.candidate);
        console.log('Candidate data updated, setting timeout for UI changes...');
        // Hide upload section after successful upload to show the resume info section
        setTimeout(() => {
          console.log('Hiding upload section...');
          setShowUploadSection(false);
          // Clear success message after showing it for a few more seconds
          setTimeout(() => {
            console.log('Clearing success message...');
            setUploadMessage('');
          }, 4000); // Clear message 4 seconds after hiding upload section
        }, 1000); // Hide upload section after 1 second to let user see success message
      } else {
        console.log('No candidate data in response:', response.data);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      // Do not clear selected file or reset file input on error
      if (error.response?.data?.error) {
        setUploadMessage(error.response.data.error);
      } else if (error.response?.status) {
        setUploadMessage(`Upload failed with status ${error.response.status}: ${error.response.statusText || 'Unknown error'}`);
      } else {
        setUploadMessage('Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };  const proceedToInterview = async () => {
    setCheckingQuestions(true);
    
    try {
      // Call the auto-generate questions endpoint which will create questions if they don't exist
      const response = await axios.post(`${API_BASE_URL}/candidates/auto-generate-questions/`, {
        candidate_id: candidate.candidate_id
      });
      
      if (response.data.questions && Object.keys(response.data.questions).length > 0) {
        // Update candidate data if it was modified
        if (response.data.candidate) {
          onCandidateUpdate(response.data.candidate);
        }
        setShowInterview(true);
      } else {
        alert('Unable to generate interview questions at this time. Please try again later or contact support.');
      }
    } catch (error: any) {
      console.error('Error auto-generating questions:', error);
      if (error.response?.status === 501) {
        // API keys not configured
        alert(error.response.data.error + '\n\n' + (error.response.data.setup_instructions || ''));
      } else if (error.response?.status === 404) {
        alert('Candidate record not found. Please refresh and try again.');
      } else {
        alert('Failed to start interview. Please try again later or contact support.');
      }
    } finally {
      setCheckingQuestions(false);
    }
  };

  const backToPortal = () => {
    setShowInterview(false);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    selectedFileRef.current = null;
    setUploadMessage('');
    const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const toggleUploadSection = () => {
    if (showUploadSection) {
      // If hiding the upload section, clear any selection
      removeSelectedFile();
    } else {
      // If showing the upload section, clear any previous state but don't show message immediately
      setUploadMessage('');
      setSelectedFile(null);
      // Clear the file input
      const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
    setShowUploadSection(!showUploadSection);
  };

  // Show interview component if requested
  if (showInterview) {
    return (
      <AudioInterview 
        candidateId={candidate.candidate_id} 
        onBackToPortal={backToPortal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-400/5 dark:to-purple-400/5"></div>
        <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 dark:from-blue-300/5 dark:to-indigo-300/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 dark:from-purple-300/5 dark:to-pink-300/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Candidate Portal
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Welcome to your interview portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
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
              <button
                onClick={onLogout}
                className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl backdrop-blur-sm border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Candidate Info Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/20 dark:border-gray-700/30">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-3 rounded-2xl shadow-lg mr-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">Your Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <p className="text-gray-900 dark:text-white font-medium">{candidate.email}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Candidate ID</label>
              <p className="text-gray-900 dark:text-white font-mono text-sm bg-white dark:bg-gray-800 px-3 py-1 rounded-lg inline-block">{candidate.candidate_id}</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Registration Date</label>
              <p className="text-gray-900 dark:text-white font-medium">
                {new Date(candidate.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Status</label>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Resume Upload Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/20 dark:border-gray-700/30">
          {/* Global Upload Success Message - shown outside upload section */}
          {uploadMessage && uploadMessage.includes('successfully') && !showUploadSection && (
            <div className="mb-6 p-6 rounded-2xl border-2 bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-700 text-green-800 dark:text-green-300">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-lg">{uploadMessage}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-2xl shadow-lg mr-4">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Resume Upload</h2>
            </div>
            {candidate.has_resume && (
              <button
                onClick={toggleUploadSection}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200"
              >
                {showUploadSection ? 'Hide Upload' : 'Upload New Resume'}
              </button>
            )}
          </div>
          
          {/* Current Resume Status */}
          {candidate.has_resume && (
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-green-500 p-2 rounded-xl mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-800 dark:text-green-300 mb-1">Resume Uploaded Successfully!</p>
                    <p className="text-green-700 dark:text-green-400 font-medium">{candidate.resume_filename}</p>
                    {candidate.resume_size && (
                      <p className="text-sm text-green-600 dark:text-green-500">
                        File Size: {(parseInt(candidate.resume_size) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={downloadResume}
                  className="px-6 py-3 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Conditional Upload Area */}
          {showUploadSection && (
            <div className="space-y-6">
              <div
                className={`border-2 border-dashed rounded-2xl relative p-8 text-center transition-all duration-300 ${
                  dragOver
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50/50 dark:bg-gray-800/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                      <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {candidate.has_resume ? 'Upload a new resume to replace the current one' : 'PDF files only, up to 10MB'}
                    </p>
                  </div>
                </div>
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="resume-upload"
                  className="absolute inset-0 cursor-pointer"
                />
              </div>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-700">
                  <div className="flex items-center">
                    <div className="bg-red-500 p-2 rounded-xl mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">{selectedFile.name}</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeSelectedFile}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex space-x-4">
                <button
                  onClick={uploadResume}
                  disabled={!selectedFile || uploading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Uploading...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {candidate.has_resume ? 'Replace Resume' : 'Upload Resume'}
                    </div>
                  )}
                </button>
              </div>

              {/* Upload Message - only show errors and info messages, not success */}
              {uploadMessage && !uploadMessage.includes('successfully') && (
                <div className={`p-6 rounded-2xl border-2 ${
                  uploadMessage.includes('Please select a new resume') 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-700 text-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-center">
                    {uploadMessage.includes('Please select a new resume') ? (
                      <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className="font-semibold text-lg">{uploadMessage}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resume required message for users without resume */}
          {!candidate.has_resume && !showUploadSection && (
            <div className="text-center py-10">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-8 border border-yellow-200 dark:border-yellow-700">
                <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg font-medium">Please upload your resume to proceed with the interview process.</p>
                <button
                  onClick={() => {
                    setUploadMessage('');
                    setSelectedFile(null);
                    setShowUploadSection(true);
                  }}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-4 px-8 rounded-2xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Resume
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Interview Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/30">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-2xl shadow-lg mr-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Interview Process</h2>
          </div>
          
          {/* Progress Steps */}
          <div className="space-y-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl flex-1">
                <span className="text-lg font-bold text-green-800 dark:text-green-300">Account Verified</span>
                <p className="text-green-700 dark:text-green-400 text-sm">Your candidate account is active and ready</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                candidate.has_resume 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                {candidate.has_resume ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-white font-bold text-lg">2</span>
                )}
              </div>
              <div className={`p-4 rounded-2xl flex-1 ${
                candidate.has_resume 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' 
                  : 'bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <span className={`text-lg font-bold ${
                  candidate.has_resume ? 'text-green-800 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  Resume Uploaded
                </span>
                <p className={`text-sm ${
                  candidate.has_resume ? 'text-green-700 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {candidate.has_resume ? 'Your resume has been successfully uploaded' : 'Please upload your resume to continue'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                candidate.has_resume 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <div className={`p-4 rounded-2xl flex-1 ${
                candidate.has_resume 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' 
                  : 'bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <span className={`text-lg font-bold ${
                  candidate.has_resume ? 'text-blue-800 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {candidate.has_resume ? 'Ready for Technical Interview' : 'Technical Interview'}
                </span>
                <p className={`text-sm ${
                  candidate.has_resume ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {candidate.has_resume ? 'AI-powered interview with personalized questions' : 'Complete previous steps first'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {candidate.has_resume ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
                <div className="flex items-start">
                  <div className="bg-blue-500 p-2 rounded-xl mr-4 mt-1">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">
                      🎉 Perfect! Your resume is ready.
                    </p>
                    <p className="text-blue-700 dark:text-blue-400 leading-relaxed">
                      Our AI interviewer will automatically generate personalized questions based on your background when you start the interview. The questions are tailored to your skills and experience.
                    </p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={proceedToInterview}
                disabled={checkingQuestions}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-6 px-8 rounded-2xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 hover:scale-105"
              >
                <div className="flex items-center justify-center">
                  {checkingQuestions ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      <span>Preparing Your Interview...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Start Technical Interview</span>
                      <svg className="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
              
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                <div className="flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Expected duration: 15-20 minutes</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6">
              <div className="flex items-start">
                <div className="bg-yellow-500 p-2 rounded-xl mr-4 mt-1">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300 mb-2">
                    Resume Required
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 leading-relaxed">
                    Please upload your resume above to proceed with the interview process. This helps us generate personalized questions for your interview.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidatePortal;
