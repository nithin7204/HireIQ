import { useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface SecurityMonitorProps {
  candidateId: string;
  isInterviewActive: boolean;
  onSecurityViolation: (reason: string) => void;
  onNetworkError: () => void;
}

const useSecurityMonitor = ({ 
  candidateId, 
  isInterviewActive, 
  onSecurityViolation,
  onNetworkError 
}: SecurityMonitorProps) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  const isRequestingPermissions = useRef(false);
  const permissionTimeout = useRef<NodeJS.Timeout | null>(null);
  const isTerminated = useRef(false);

  const terminateInterview = useCallback(async (reason: string) => {
    if (isTerminated.current) return; // Prevent multiple terminations
    
    isTerminated.current = true;
    console.log('🚨 Terminating interview:', reason);
    
    try {
      await axios.post(`${API_BASE_URL}/candidates/terminate-interview/`, {
        candidate_id: candidateId,
        reason: reason
      });
    } catch (error) {
      console.error('Failed to terminate interview:', error);
    }
  }, [candidateId, API_BASE_URL]);

  // Monitor tab/window visibility changes
  useEffect(() => {
    if (!isInterviewActive || isTerminated.current) return;

    let blurTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      // Don't terminate if we're requesting permissions or already terminated
      if (isRequestingPermissions.current || isTerminated.current) {
        console.log('👀 Visibility change ignored - permission request in progress or terminated');
        return;
      }

      if (document.hidden) {
        console.log('🚨 Tab hidden - terminating interview');
        const reason = 'Tab/Window switch detected during interview';
        terminateInterview(reason);
        onSecurityViolation(reason);
      }
    };

    const handleBlur = () => {
      console.log('👀 Window blur detected - Focus lost');
      console.log('🔍 Permission request status:', isRequestingPermissions.current);
      console.log('🔍 Interview terminated status:', isTerminated.current);
      
      // Don't terminate if we're requesting permissions or already terminated
      if (isRequestingPermissions.current || isTerminated.current) {
        console.log('✅ Window blur ignored - permission request in progress or terminated');
        return;
      }

      // Clear any existing timeout
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        console.log('🧹 Cleared existing blur timeout');
      }

      // Add a longer delay to avoid false positives from permission dialogs
      console.log('⏰ Setting 3-second delay before focus check...');
      blurTimeout = setTimeout(() => {
        console.log('⏰ Blur timeout triggered - checking focus status...');
        console.log('🔍 Document has focus:', document.hasFocus());
        console.log('🔍 Permission request status:', isRequestingPermissions.current);
        console.log('🔍 Interview terminated status:', isTerminated.current);
        
        if (!document.hasFocus() && !isRequestingPermissions.current && !isTerminated.current) {
          console.log('🚨 TERMINATING: Window focus lost during interview');
          const reason = 'Window focus lost during interview';
          terminateInterview(reason);
          onSecurityViolation(reason);
        } else {
          console.log('✅ Focus check passed - no termination needed');
        }
      }, 3000); // 3 second delay to allow for permission dialogs
    };

    const handleFocus = () => {
      // Clear any pending blur timeout when focus returns
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
      
      // Clear any pending permission state when focus returns
      if (isRequestingPermissions.current && permissionTimeout.current) {
        clearTimeout(permissionTimeout.current);
        isRequestingPermissions.current = false;
        console.log('🔄 Permission request completed - monitoring resumed');
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      
      // Clear any pending timeouts
      if (blurTimeout) {
        clearTimeout(blurTimeout);
      }
      if (permissionTimeout.current) {
        clearTimeout(permissionTimeout.current);
      }
    };
  }, [isInterviewActive, terminateInterview, onSecurityViolation]);

  // Monitor network connectivity
  useEffect(() => {
    if (!isInterviewActive) return;

    const handleOnline = () => {
      console.log('Network connection restored');
    };

    const handleOffline = () => {
      const reason = 'Network connection lost during interview';
      terminateInterview(reason);
      onNetworkError();
    };

    // Monitor network status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic network check
    const networkCheckInterval = setInterval(async () => {
      try {
        // Simple network check - try to reach the API
        await axios.get(`${API_BASE_URL}/health/`, { timeout: 5000 });
      } catch (error) {
        const reason = 'Network connectivity issues detected';
        terminateInterview(reason);
        onNetworkError();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(networkCheckInterval);
    };
  }, [isInterviewActive, API_BASE_URL, terminateInterview, onNetworkError]);

  // Prevent right-click context menu
  useEffect(() => {
    if (!isInterviewActive) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common developer tools shortcuts
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C')
      ) {
        e.preventDefault();
        const reason = 'Attempted to access developer tools';
        terminateInterview(reason);
        onSecurityViolation(reason);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isInterviewActive, terminateInterview, onSecurityViolation]);

  // Monitor for window resize (potential screen sharing detection)
  useEffect(() => {
    if (!isInterviewActive) return;

    let initialSize = { width: window.innerWidth, height: window.innerHeight };
    
    const handleResize = () => {
      const currentSize = { width: window.innerWidth, height: window.innerHeight };
      const widthChange = Math.abs(currentSize.width - initialSize.width);
      const heightChange = Math.abs(currentSize.height - initialSize.height);
      
      // If significant resize occurs, it might indicate screen sharing or window manipulation
      if (widthChange > 100 || heightChange > 100) {
        console.warn('Significant window resize detected');
        // You could add a warning or additional monitoring here
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isInterviewActive]);

  // Method to temporarily pause monitoring (for permission requests)
  const pauseMonitoring = useCallback((duration: number = 10000) => {
    console.log('⏸️ Pausing security monitoring for', duration, 'ms');
    isRequestingPermissions.current = true;
    
    if (permissionTimeout.current) {
      clearTimeout(permissionTimeout.current);
    }
    
    permissionTimeout.current = setTimeout(() => {
      isRequestingPermissions.current = false;
      console.log('▶️ Security monitoring resumed after timeout');
    }, duration);
  }, []);

  const resumeMonitoring = useCallback(() => {
    console.log('▶️ Manually resuming security monitoring');
    if (permissionTimeout.current) {
      clearTimeout(permissionTimeout.current);
      permissionTimeout.current = null;
    }
    isRequestingPermissions.current = false;
  }, []);

  return {
    terminateInterview,
    pauseMonitoring,
    resumeMonitoring
  };
};

export default useSecurityMonitor;
