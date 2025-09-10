# Security Features Testing Guide

This document outlines how to test the newly implemented security features in the HireIQ application.

## Features Implemented

### 1. Prevent Multiple Test Attempts
- **Feature**: Candidates cannot take the same test multiple times
- **Implementation**: Interview state tracking with `interview_started`, `interview_completed`, and `interview_terminated` fields

### 2. Security Monitoring During Interview
- **Feature**: Automatic interview termination on security violations
- **Monitored Events**:
  - Tab switching (visibilitychange event)
  - Window focus loss (blur event)
  - Network connectivity issues
  - Developer tools access attempts (F12, Ctrl+Shift+I, etc.)
  - Right-click context menu (disabled)

## Testing Instructions

### Test 1: Prevent Multiple Attempts

1. **Setup**: 
   - Start both backend and frontend servers
   - Have a valid candidate ID ready

2. **Test Steps**:
   ```bash
   # Backend: http://localhost:8000
   # Frontend: http://localhost:3000
   ```
   - Navigate to http://localhost:3000/candidate
   - Enter a valid candidate ID
   - Complete the interview process fully
   - Try to access the same candidate ID again

3. **Expected Result**: 
   - Second attempt should show: "You have already completed this interview. Multiple attempts are not allowed."

### Test 2: Tab Switching Detection

1. **Setup**: 
   - Start an interview with a valid candidate ID
   - Proceed to the interview questions screen

2. **Test Steps**:
   - Start answering questions
   - Switch to another browser tab (Ctrl+Tab or click another tab)
   - Return to the interview tab

3. **Expected Result**: 
   - Interview should be automatically terminated
   - User should see "Interview Terminated" screen with violation reason
   - Backend should log the termination in the database

### Test 3: Window Focus Loss Detection

1. **Setup**: 
   - Start an interview with a valid candidate ID
   - Proceed to the interview questions screen

2. **Test Steps**:
   - Start answering questions
   - Click on another application window (outside browser)
   - Return to the browser

3. **Expected Result**: 
   - Interview should be automatically terminated
   - User should see termination screen

### Test 4: Developer Tools Detection

1. **Setup**: 
   - Start an interview with a valid candidate ID
   - Proceed to the interview questions screen

2. **Test Steps**:
   - Try to open developer tools:
     - Press F12
     - Press Ctrl+Shift+I
     - Press Ctrl+Shift+J
     - Press Ctrl+U (view source)

3. **Expected Result**: 
   - Interview should be automatically terminated
   - Violation reason should mention "developer tools"

### Test 5: Network Connectivity Monitoring

1. **Setup**: 
   - Start an interview with a valid candidate ID
   - Proceed to the interview questions screen

2. **Test Steps**:
   - Disconnect internet connection temporarily
   - Or block access to the backend API

3. **Expected Result**: 
   - Interview should be terminated after network check fails
   - User should see network error message

### Test 6: Right-Click Context Menu

1. **Setup**: 
   - Start an interview with a valid candidate ID
   - Proceed to the interview questions screen

2. **Test Steps**:
   - Right-click anywhere on the page

3. **Expected Result**: 
   - Context menu should be disabled/not appear

## API Endpoints for Testing

### New Endpoints Added:

1. **Start Interview**
   ```
   POST /api/candidates/start-interview/
   Body: {"candidate_id": "your-candidate-id"}
   ```

2. **Complete Interview**
   ```
   POST /api/candidates/complete-interview/
   Body: {"candidate_id": "your-candidate-id"}
   ```

3. **Terminate Interview**
   ```
   POST /api/candidates/terminate-interview/
   Body: {
     "candidate_id": "your-candidate-id",
     "reason": "Security violation reason"
   }
   ```

4. **Enhanced Validation**
   ```
   POST /api/candidates/validate/
   Body: {"candidate_id": "your-candidate-id"}
   
   Response codes:
   - 200: Valid and available
   - 403: Already completed/terminated
   - 404: Invalid candidate ID
   ```

## Manual Database Testing

### Check Interview State:
```javascript
// In MongoDB console or through Django shell
from candidates.models import Candidate

# Check a candidate's interview state
candidate = Candidate.objects.get(candidate_id="your-id")
print(f"Started: {candidate.interview_started}")
print(f"Completed: {candidate.interview_completed}")
print(f"Terminated: {candidate.interview_terminated}")
print(f"Termination Reason: {candidate.termination_reason}")
```

### Reset Interview State (for testing):
```javascript
// ONLY FOR TESTING - Reset interview state
candidate = Candidate.objects.get(candidate_id="your-id")
candidate.interview_started = False
candidate.interview_completed = False
candidate.interview_terminated = False
candidate.termination_reason = None
candidate.interview_start_time = None
candidate.interview_completion_time = None
candidate.save()
```

## Security Monitoring Details

### JavaScript Events Monitored:
- `document.visibilitychange`: Tab switching
- `window.blur`: Window focus loss
- `window.focus`: Window focus gain
- `window.offline/online`: Network status
- `contextmenu`: Right-click prevention
- `keydown`: Developer tools shortcuts

### Network Monitoring:
- Periodic health checks every 30 seconds
- API connectivity validation
- Automatic termination on network failures

## Notes for Developers

1. **Security Monitor Hook**: Located in `src/hooks/useSecurityMonitor.ts`
2. **Database Migration**: Run `migrate_interview_fields.py` for existing data
3. **Frontend Component**: Updated `AudioInterview.tsx` with security features
4. **Backend Views**: New endpoints in `candidates/views.py`

## Production Considerations

1. **Logging**: All security violations are logged to console (consider proper logging)
2. **Monitoring**: Consider adding analytics for security violation patterns
3. **User Experience**: Current termination is immediate - consider warnings first
4. **False Positives**: Monitor for legitimate users being incorrectly flagged

## Troubleshooting

### Common Issues:
1. **Migration Errors**: Ensure MongoDB connection before running migration
2. **Security Hook Not Working**: Check browser console for JavaScript errors
3. **Backend Errors**: Check Django server logs for API endpoint issues
4. **State Persistence**: Verify MongoDB field updates are working
