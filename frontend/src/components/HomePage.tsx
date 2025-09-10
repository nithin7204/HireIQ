import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-surface-white/95 dark:bg-gray-900/80 backdrop-blur-premium shadow-premium py-6 px-8 flex justify-between items-center sticky top-0 z-50 transition-colors duration-300 border-b border-professional-400/10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-2 rounded-xl">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent tracking-wide">HireIQ</span>
        </div>
        <nav className="hidden md:flex space-x-8 items-center">
          <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Features</a>
          <a href="#how-it-works" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">How It Works</a>
          <a href="#portals" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Portals</a>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </nav>
        <div className="md:hidden flex items-center gap-3">
          {/* Mobile Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          <button className="text-gray-700 dark:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6 transition-colors duration-300">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            AI-Powered Recruitment Platform
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight transition-colors duration-300">
            Transform Your
            <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent block">
              Hiring Process
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
            Leverage cutting-edge AI technology to streamline recruitment, conduct intelligent interviews, 
            and make data-driven hiring decisions that build exceptional teams.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button 
              onClick={() => navigate('/recruiter')}
              className="group bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Start Recruiting
              <svg className="w-5 h-5 ml-2 inline group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button 
              onClick={() => navigate('/candidate')}
              className="bg-surface-white text-indigo-600 px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-indigo-200/60 hover:border-indigo-300 hover:bg-accent-50 transition-all duration-300 shadow-premium hover:shadow-elevated"
            >
              Join as Candidate
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Reduce hiring time by 70% with AI-powered screening</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">Precise Matching</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Find the perfect candidates with advanced AI algorithms</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">Data-Driven</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Make informed decisions with comprehensive analytics</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-surface-pearl/60 via-surface-white/40 to-professional-200/30 dark:bg-gray-800/50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">
              Powerful Features for Modern Hiring
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-300">
              Everything you need to revolutionize your recruitment process and find the best talent efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-surface-white/90 dark:bg-gray-800 rounded-2xl p-8 shadow-premium border border-professional-400/10 hover:shadow-elevated dark:shadow-2xl transition-all duration-300 backdrop-blur-xs">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 rounded-xl w-14 h-14 flex items-center justify-center mb-6 transition-colors duration-300">
                <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 transition-colors duration-300">AI-Powered Screening</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Automatically evaluate candidates using advanced machine learning algorithms for better hiring decisions.</p>
            </div>

            <div className="bg-surface-white/90 dark:bg-gray-800 rounded-2xl p-8 shadow-premium border border-professional-400/10 hover:shadow-elevated dark:shadow-2xl transition-all duration-300 backdrop-blur-xs">
              <div className="bg-green-100 dark:bg-green-900/50 rounded-xl w-14 h-14 flex items-center justify-center mb-6 transition-colors duration-300">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 transition-colors duration-300">Voice Interviews</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Conduct seamless voice interviews with real-time transcription and intelligent analysis.</p>
            </div>

            <div className="bg-surface-white/90 dark:bg-gray-800 rounded-2xl p-8 shadow-premium border border-professional-400/10 hover:shadow-elevated dark:shadow-2xl transition-all duration-300 backdrop-blur-xs">
              <div className="bg-blue-100 dark:bg-blue-900/50 rounded-xl w-14 h-14 flex items-center justify-center mb-6 transition-colors duration-300">
                <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 transition-colors duration-300">Smart Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Get detailed insights and analytics to track your hiring performance and optimize your process.</p>
            </div>

            <div className="bg-surface-white/90 dark:bg-gray-800 rounded-2xl p-8 shadow-premium border border-professional-400/10 hover:shadow-elevated dark:shadow-2xl transition-all duration-300 backdrop-blur-xs">
              <div className="bg-purple-100 dark:bg-purple-900/50 rounded-xl w-14 h-14 flex items-center justify-center mb-6 transition-colors duration-300">
                <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 transition-colors duration-300">Candidate Management</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Efficiently manage candidate profiles, resumes, and interview schedules in one place.</p>
            </div>

            <div className="bg-surface-white/90 dark:bg-gray-800 rounded-2xl p-8 shadow-premium border border-professional-400/10 hover:shadow-elevated dark:shadow-2xl transition-all duration-300 backdrop-blur-xs">
              <div className="bg-red-100 dark:bg-red-900/50 rounded-xl w-14 h-14 flex items-center justify-center mb-6 transition-colors duration-300">
                <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 transition-colors duration-300">Email Integration</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Automated email notifications and communication tools to keep everyone in the loop.</p>
            </div>

            <div className="bg-surface-white/90 dark:bg-gray-800 rounded-2xl p-8 shadow-premium border border-professional-400/10 hover:shadow-elevated dark:shadow-2xl transition-all duration-300 backdrop-blur-xs">
              <div className="bg-yellow-100 dark:bg-yellow-900/50 rounded-xl w-14 h-14 flex items-center justify-center mb-6 transition-colors duration-300">
                <svg className="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 transition-colors duration-300">Secure Platform</h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">Enterprise-grade security with OAuth authentication and encrypted data storage.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Section */}
      <section id="portals" className="py-20 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">
              Choose Your Portal
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors duration-300">
              Access the right tools for your role in the hiring process
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface-white/95 dark:bg-gray-800 rounded-3xl shadow-elevated border border-professional-400/10 p-10 hover:shadow-premium dark:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-premium">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-8">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Recruiter Portal</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed transition-colors duration-300">
                Comprehensive dashboard for HR professionals to manage candidates, conduct AI-powered evaluations, 
                schedule interviews, and make data-driven hiring decisions.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Candidate Management System
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  AI-Powered Evaluations
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Advanced Analytics Dashboard
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Email Integration
                </li>
              </ul>
              <button 
                onClick={() => navigate('/recruiter')}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Access Recruiter Dashboard
              </button>
            </div>

            <div className="bg-surface-white/95 dark:bg-gray-800 rounded-3xl shadow-elevated border border-professional-400/10 p-10 hover:shadow-premium dark:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-premium">
              <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl w-16 h-16 flex items-center justify-center mb-8">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Candidate Portal</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed transition-colors duration-300">
                User-friendly interface for job seekers to submit applications, participate in AI interviews, 
                track application status, and showcase their skills effectively.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Resume Upload & Management
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Interactive Voice Interviews
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Application Status Tracking
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Real-time Notifications
                </li>
              </ul>
              <button 
                onClick={() => navigate('/candidate')}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-green-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Access Candidate Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-16 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-2 rounded-xl">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold">HireIQ</span>
              </div>
              <p className="text-gray-300 dark:text-gray-400 mb-4 max-w-md transition-colors duration-300">
                Revolutionizing the hiring process with AI-powered technology to connect the right talent with the right opportunities.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-300 dark:text-gray-400">
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">Recruiter Portal</a></li>
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">Candidate Portal</a></li>
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">AI Features</a></li>
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">Analytics</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-300 dark:text-gray-400">
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white dark:hover:text-gray-300 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 dark:border-gray-700 mt-12 pt-8 text-center text-gray-400 dark:text-gray-500 transition-colors duration-300">
            <p>&copy; {new Date().getFullYear()} HireIQ. All rights reserved. Built with ❤️ for better hiring.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
