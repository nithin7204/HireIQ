# Microphone Permission Issue Fix

## Problem
When candidates clicked "Start Recording" button during the interview, the browser's microphone permission dialog appeared, which triggered the security monitoring system. The `window.blur` event fired when the permission dialog opened, causing the interview to be immediately terminated with a "Window focus lost during interview" error.

## Root Cause
The security monitoring system was designed to detect when users switch tabs or windows during an interview. However, it was also detecting legitimate browser dialogs (like microphone permission requests) as focus loss events, leading to false positive terminations.

## Solution Implemented

### 1. Enhanced Security Monitor Hook (`useSecurityMonitor.ts`)

**Intelligent Permission Detection:**
- Modified the security monitor to detect when `navigator.mediaDevices.getUserMedia()` is called
- Temporarily pauses security monitoring during permission requests
- Uses a state flag `isRequestingPermissions` to track permission request status
- Adds timeout protection (30 seconds max) in case permission dialogs hang

**Key Changes:**
```typescript
// Monitor for getUserMedia calls (microphone/camera permission requests)
const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
navigator.mediaDevices.getUserMedia = function(...args) {
  console.log('getUserMedia called - suspending security monitoring temporarily');
  isRequestingPermissions = true;
  
  // Clear the flag after a reasonable timeout (30 seconds max)
  permissionTimeout = setTimeout(() => {
    isRequestingPermissions = false;
    console.log('Permission timeout - resuming security monitoring');
  }, 30000);

  return originalGetUserMedia.apply(this, args)
    .then((stream) => {
      // Permission granted, clear the flag
      clearTimeout(permissionTimeout);
      isRequestingPermissions = false;
      console.log('Permission granted - resuming security monitoring');
      return stream;
    })
    .catch((error) => {
      // Permission denied or error, clear the flag
      clearTimeout(permissionTimeout);
      isRequestingPermissions = false;
      console.log('Permission denied/error - resuming security monitoring');
      throw error;
    });
};
```

**Enhanced Blur Detection:**
- Added delay before terminating on window blur (1 second)
- Checks if permission request is in progress before terminating
- Prevents false positives from browser dialogs

### 2. Improved User Experience (`AudioInterview.tsx`)

**Better Error Handling:**
- Enhanced `startRecording()` function with specific error messages
- Distinguishes between different types of microphone errors:
  - `NotAllowedError`: Permission denied
  - `NotFoundError`: No microphone found
  - Generic errors: General troubleshooting

**User Guidance:**
- Added informational notice before first recording attempt
- Explains what will happen when permission is requested
- Reassures users about privacy and security

**Visual Feedback:**
- Shows temporary message during permission request
- Clear error messages for different failure scenarios
- Better context for users throughout the process

## Technical Implementation

### Security Monitoring Flow:
1. **Normal State**: Security monitoring active, watching for violations
2. **Permission Request**: getUserMedia() called → monitoring paused
3. **Dialog Open**: Window blur/visibility change → ignored (permission in progress)
4. **Permission Granted/Denied**: monitoring resumed automatically
5. **Timeout Protection**: If no response in 30 seconds, monitoring resumes

### Error Prevention:
- **False Positive Prevention**: Permission dialogs no longer trigger termination
- **Legitimate Violations**: Still detected (actual tab switching, window switching)
- **Recovery**: Monitoring resumes after permission flow completes

## Testing Results

### Before Fix:
❌ Click "Start Recording" → Permission dialog appears → Interview immediately terminated

### After Fix:
✅ Click "Start Recording" → Permission dialog appears → User grants/denies permission → Interview continues normally

### Test Scenarios Covered:
1. **Permission Granted**: Works normally, monitoring resumes
2. **Permission Denied**: Shows appropriate error, monitoring resumes
3. **Permission Timeout**: Monitoring resumes after 30 seconds
4. **Actual Violations**: Still properly detected (tab switching still terminates)

## Security Considerations

### Maintained Security:
- **Real violations still detected**: Tab switching, window focus loss outside permission flow
- **Developer tools prevention**: Still active
- **Network monitoring**: Unaffected
- **Right-click prevention**: Still active

### Enhanced Precision:
- **Fewer false positives**: Legitimate browser interactions allowed
- **Better user experience**: No unexpected terminations
- **Clear feedback**: Users understand what's happening

## Code Changes Summary

### Files Modified:
1. **`/frontend/src/hooks/useSecurityMonitor.ts`**
   - Enhanced blur/visibility monitoring logic
   - Added getUserMedia interception
   - Implemented permission state tracking

2. **`/frontend/src/components/AudioInterview.tsx`**
   - Improved error handling in startRecording()
   - Added user guidance notice
   - Better feedback during permission requests

### Backward Compatibility:
- ✅ All existing security features maintained
- ✅ No breaking changes to API
- ✅ No database changes required
- ✅ Interview lifecycle unchanged

## Future Improvements

### Potential Enhancements:
1. **Multiple Permission Types**: Handle camera permissions similarly
2. **Advanced Detection**: Distinguish between different dialog types
3. **User Preferences**: Remember permission choices
4. **Accessibility**: Better screen reader support for permission flows

This fix ensures that legitimate microphone permission requests don't interfere with interview security while maintaining robust protection against actual cheating attempts.
