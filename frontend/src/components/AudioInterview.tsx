import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Question {
  id: string;
  text: string;
  topic: string;
  type?: string;
}

interface AudioInterviewProps {
  candidateId: string;
  onBackToPortal: () => void;
}

const AudioInterview: React.FC<AudioInterviewProps> = ({ candidateId, onBackToPortal }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<{ [key: string]: any }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [hrInstructions, setHrInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsRead, setInstructionsRead] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetchQuestions();
    return () => {
      // Cleanup
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/candidates/questions/${candidateId}/`);
      
      // Extract HR instructions if available
      if (response.data.hr_instructions || response.data.candidate?.hr_prompt) {
        setHrInstructions(response.data.hr_instructions || response.data.candidate.hr_prompt);
      }
      
      // Convert the new nested questions structure to an array
      const questionsData = response.data.questions;
      const questionArray: Question[] = [];
      let questionIndex = 0;
      
      console.log('Received questions data:', questionsData);
      
      // Handle the new nested structure with categories
      Object.entries(questionsData).forEach(([category, categoryQuestions]) => {
        console.log(`Processing category: ${category}`, categoryQuestions);
        if (Array.isArray(categoryQuestions)) {
          categoryQuestions.forEach((questionObj: any) => {
            console.log('Processing question:', questionObj);
            questionArray.push({
              id: `q_${questionIndex}`,
              text: questionObj.question,
              topic: questionObj.topic || category,
              type: questionObj.type || category
            });
            questionIndex++;
          });
        }
      });
      
      console.log('Final question array:', questionArray);
      
      setQuestions(questionArray);
      setError('');
    } catch (err: any) {
      console.error('Error fetching questions:', err);
      setError('Failed to load interview questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const playRecording = () => {
    if (audioBlob && audioPlayerRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.play();
      setIsPlaying(true);
      
      audioPlayerRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data:audio/wav;base64, prefix
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveResponse = async () => {
    if (!audioBlob) {
      setError('Please record your response first.');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    setIsSubmitting(true);

    try {
      // First, transcribe the audio
      let transcription = '';
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'response.wav');
        formData.append('service', 'gemini'); // Use Gemini transcription service
        
        console.log('Transcribing audio...');
        const transcriptionResponse = await axios.post(`${API_BASE_URL}/candidates/transcribe-audio/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (transcriptionResponse.data.transcription) {
          transcription = transcriptionResponse.data.transcription;
          console.log('Transcription successful:', transcription.substring(0, 100) + '...');
        }
      } catch (transcriptionError) {
        console.warn('Transcription failed, saving without transcription:', transcriptionError);
        // Continue saving even if transcription fails
      }

      // Then save the response with transcription
      const audioBase64 = await blobToBase64(audioBlob);
      
      const responseData = {
        candidate_id: candidateId,
        question_id: currentQuestion.id,
        question_text: currentQuestion.text,
        audio_data: audioBase64,
        transcription: transcription, // Now includes actual transcription
        duration: recordingTime
      };

      await axios.post(`${API_BASE_URL}/candidates/save-audio-response/`, responseData);
      
      // Save response locally for UI
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: {
          audioBlob,
          duration: recordingTime,
          timestamp: new Date().toISOString()
        }
      }));

      // Move to next question or complete interview
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setAudioBlob(null);
        setRecordingTime(0);
        setError('');
      } else {
        setInterviewCompleted(true);
      }
      
    } catch (err: any) {
      console.error('Error saving response:', err);
      setError('Failed to save response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setAudioBlob(null);
      setRecordingTime(0);
      setError('');
    }
  };

  const skipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAudioBlob(null);
      setRecordingTime(0);
      setError('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const readInstructions = () => {
    if (hrInstructions) {
      const utterance = new SpeechSynthesisUtterance(hrInstructions);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  const startInterview = () => {
    setShowInstructions(false);
    setInstructionsRead(true);
  };

  // Instructions Screen Component
  const InstructionsScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Google SDE Interview</h1>
              <p className="text-sm text-gray-600">AI-Powered Technical Interview</p>
            </div>
            <button
              onClick={onBackToPortal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200"
            >
              Exit Interview
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Google Logo and Interviewer Card */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Google</h2>
            <p className="text-lg text-gray-600">Software Development Engineer Interview</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Your AI Interviewer</h3>
                <p className="text-blue-800">
                  I'm an AI interviewer trained to conduct Google-style SDE interviews. 
                  I'll be evaluating your technical skills, problem-solving approach, and cultural fit.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Interview Instructions</h3>
            <div className="prose max-w-none">
              <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                {hrInstructions || `Hello! I'm your AI interviewer for Google's Software Development Engineer position.

INTERVIEW INSTRUCTIONS:
• This interview will last approximately 45-60 minutes
• We'll cover both technical and behavioral questions
• For technical questions, explain your thought process clearly
• You can ask clarifying questions if needed
• Take your time to think through problems systematically
• We value problem-solving approach over perfect solutions

INTERVIEW STRUCTURE:
1. Brief introduction and warm-up questions (5 minutes)
2. Technical coding/system design questions (30-40 minutes)
3. Behavioral questions about experience and teamwork (10-15 minutes)
4. Questions for me about the role/team (5 minutes)

EVALUATION CRITERIA:
• Problem-solving and analytical thinking
• Coding skills and technical knowledge
• Communication and collaboration abilities
• Leadership and impact potential
• Cultural fit with Google's values

Remember: We're looking for your thought process, not just the right answer. Good luck!`}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={readInstructions}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9v6l7-3-7-3z" />
              </svg>
              Listen to Instructions
            </button>
            
            <button
              onClick={startInterview}
              className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 font-semibold"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Interview
            </button>
          </div>

          {/* Interview Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">45-60</div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">SDE</div>
              <div className="text-sm text-gray-600">Role</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing your Google SDE interview...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Interview Not Ready</h2>
          <p className="text-gray-600 mb-4">
            Unable to prepare your interview questions. Please try again or contact support.
          </p>
          <button
            onClick={onBackToPortal}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Back to Portal
          </button>
        </div>
      </div>
    );
  }

  // Show instructions screen first
  if (showInstructions && !instructionsRead) {
    return <InstructionsScreen />;
  }

  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Interview Completed!</h2>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for completing your Google SDE interview. Your responses have been saved successfully.
          </p>
          
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Interview Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{Object.keys(responses).length}</div>
                <div className="text-blue-800">Questions Answered</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{questions.length}</div>
                <div className="text-green-800">Total Questions</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
            <p className="text-blue-800 text-sm">
              Our team will review your responses and get back to you within 3-5 business days. 
              Thank you for your interest in joining Google!
            </p>
          </div>

          <button
            onClick={onBackToPortal}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const hasRecorded = audioBlob !== null;
  const hasResponse = responses[currentQuestion?.id];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-red-500 rounded-full mr-3 flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Google SDE Interview</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length} • AI Interviewer
                </p>
              </div>
            </div>
            <button
              onClick={onBackToPortal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200"
            >
              Exit Interview
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Interview Progress</span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Interviewer Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Google AI Interviewer</h3>
                <div className="flex space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {currentQuestion.type || 'General'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {currentQuestion.topic}
                  </span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed text-lg">
                  {currentQuestion.text}
                </p>
              </div>
              <div className="flex items-center mt-4 space-x-4">
                <button
                  onClick={() => {
                    const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
                    utterance.rate = 0.9;
                    utterance.pitch = 1.0;
                    speechSynthesis.speak(utterance);
                  }}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition duration-200"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9v6l7-3-7-3z" />
                  </svg>
                  Listen to Question
                </button>
                <div className="text-sm text-gray-500">
                  💡 Take your time to think through the problem
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Response</h3>
            <div className="text-sm text-gray-500">
              Speak clearly and explain your thought process
            </div>
          </div>
          
          {/* Recording Status */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
              isRecording 
                ? 'border-red-500 bg-red-50 shadow-lg scale-105' 
                : hasRecorded 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 bg-gray-50'
            }`}>
              {isRecording ? (
                <div className="text-center">
                  <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse mx-auto mb-3"></div>
                  <span className="text-lg font-bold text-red-600">
                    {formatTime(recordingTime)}
                  </span>
                  <div className="text-xs text-red-500 mt-1">Recording...</div>
                </div>
              ) : hasRecorded ? (
                <div className="text-center">
                  <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-lg font-bold text-green-600">
                    {formatTime(recordingTime)}
                  </span>
                  <div className="text-xs text-green-500 mt-1">Recorded</div>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-sm text-gray-500">Ready to Record</span>
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4 mb-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={hasResponse}
                className="flex items-center px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-lg transform hover:scale-105"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 shadow-lg"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Recording
              </button>
            )}

            {hasRecorded && !isRecording && (
              <button
                onClick={playRecording}
                disabled={isPlaying}
                className="flex items-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition duration-200 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isPlaying ? 'Playing...' : 'Review Response'}
              </button>
            )}
          </div>

          {/* Hidden audio player */}
          <audio ref={audioPlayerRef} style={{ display: 'none' }} />

          {/* Save Response Button */}
          {hasRecorded && !hasResponse && (
            <div className="text-center">
              <button
                onClick={saveResponse}
                disabled={isSubmitting}
                className="px-10 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-lg transform hover:scale-105 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Transcribing & Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Save & Continue
                  </>
                )}
              </button>
            </div>
          )}

          {/* Response Saved Indicator */}
          {hasResponse && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-lg text-green-800 font-semibold">
                  Great! Your response has been recorded.
                </span>
              </div>
              <p className="text-sm text-green-600 mt-2">
                The interviewer has noted your answer. Ready for the next question?
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous Question
            </button>

            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800 mb-1">
                {Object.keys(responses).length} of {questions.length} completed
              </p>
              <div className="flex items-center justify-center space-x-2">
                {Array.from({ length: questions.length }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      responses[`q_${i}`] 
                        ? 'bg-green-500' 
                        : i === currentQuestionIndex 
                          ? 'bg-blue-500' 
                          : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={skipQuestion}
                className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200"
              >
                Skip Question
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : hasResponse ? (
              <button
                onClick={() => setInterviewCompleted(true)}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 font-semibold shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Interview
              </button>
            ) : (
              <div className="px-6 py-3">
                <p className="text-sm text-gray-500">Answer to proceed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioInterview;
