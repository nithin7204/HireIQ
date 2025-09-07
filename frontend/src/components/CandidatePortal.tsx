import React, { useState, useRef } from 'react';
import axios from 'axios';
import AudioInterview from './AudioInterview';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Candidate Portal</h1>
              <p className="text-sm text-gray-600">Welcome to your interview portal</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Candidate Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{candidate.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Candidate ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{candidate.candidate_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Registration Date</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(candidate.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Resume Upload Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {/* Global Upload Success Message - shown outside upload section */}
          {uploadMessage && uploadMessage.includes('successfully') && !showUploadSection && (
            <div className="mb-4 p-4 rounded-lg border-2 bg-green-50 border-green-400 text-green-800">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{uploadMessage}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Resume Upload</h2>
            {candidate.has_resume && (
              <button
                onClick={toggleUploadSection}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showUploadSection ? 'Hide Upload' : 'Upload New Resume'}
              </button>
            )}
          </div>
          
          {/* Current Resume Status */}
          {candidate.has_resume && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">Resume uploaded:</p>
                    <p className="text-sm text-green-700">{candidate.resume_filename}</p>
                    {candidate.resume_size && (
                      <p className="text-xs text-green-600">
                        Size: {(parseInt(candidate.resume_size) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={downloadResume}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition duration-200"
                >
                  Download
                </button>
              </div>
            </div>
          )}

          {/* Conditional Upload Area */}
          {showUploadSection && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg relative p-6 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-2">
                  <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
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
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={removeSelectedFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  {uploading ? 'Uploading...' : candidate.has_resume ? 'Replace Resume' : 'Upload Resume'}
                </button>
              </div>

              {/* Upload Message - only show errors and info messages, not success */}
              {uploadMessage && !uploadMessage.includes('successfully') && (
                <div className={`p-4 rounded-lg border-2 ${
                  uploadMessage.includes('Please select a new resume') 
                    ? 'bg-blue-50 border-blue-400 text-blue-800'
                    : 'bg-red-50 border-red-400 text-red-800'
                }`}>
                  <div className="flex items-center">
                    {uploadMessage.includes('Please select a new resume') ? (
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className="font-medium">{uploadMessage}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resume required message for users without resume */}
          {!candidate.has_resume && !showUploadSection && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Please upload your resume to proceed with the interview process.</p>
              <button
                onClick={() => {
                  setUploadMessage('');
                  setSelectedFile(null);
                  setShowUploadSection(true);
                }}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              >
                Upload Resume
              </button>
            </div>
          )}
        </div>

        {/* Interview Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Interview Process</h2>
          
          {/* Progress Steps */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-700 font-medium">Account verified</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                candidate.has_resume ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {candidate.has_resume ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm text-gray-400">2</span>
                )}
              </div>
              <span className={`text-sm font-medium ${candidate.has_resume ? 'text-gray-700' : 'text-gray-400'}`}>
                Resume uploaded
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                candidate.has_resume ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {candidate.has_resume ? (
                  <span className="text-sm text-blue-600 font-medium">3</span>
                ) : (
                  <span className="text-sm text-gray-400">3</span>
                )}
              </div>
              <span className={`text-sm font-medium ${candidate.has_resume ? 'text-blue-600' : 'text-gray-400'}`}>
                {candidate.has_resume ? 'Ready for Google SDE Interview' : 'Google SDE Interview (pending resume)'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {candidate.has_resume ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-800 font-medium">
                    Perfect! Your resume is ready. Our AI interviewer will automatically generate Google SDE questions based on your background when you start the interview.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={proceedToInterview}
                disabled={checkingQuestions}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 font-medium text-lg shadow-sm"
              >
                <div className="flex items-center justify-center">
                  {checkingQuestions ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Preparing Interview...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Start Google SDE Interview
                    </>
                  )}
                </div>
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-yellow-800">
                  Please upload your resume above to proceed with the interview process.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidatePortal;
