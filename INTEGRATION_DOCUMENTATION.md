# Adolat AI Frontend-Backend Integration Documentation

## Overview

This document explains how the Adolat AI frontend (React/TypeScript) has been integrated with the Django REST Framework backend. The integration enables:

1. User authentication and device management
2. Persistent storage of case data
3. Profile management
4. Device limit enforcement (2 devices maximum)

## Architecture

The integration follows a client-server architecture where:
- The React frontend communicates with the Django backend via RESTful APIs
- Authentication is handled using JWT tokens
- All data is synchronized between frontend and backend when online
- Local storage is used as a fallback when offline

## Key Integration Points

### 1. Authentication Flow

#### Frontend Changes:
- Modified `App.tsx` to use backend authentication
- Added `loginWithToken` function in `apiService.ts`
- Implemented device registration with backend

#### Backend Endpoints Used:
- `POST /api/users/login/` - User authentication
- `POST /api/users/devices/register/` - Device registration
- `GET /api/users/devices/` - Get user devices
- `DELETE /api/users/devices/remove/{device_id}/` - Remove device

#### Integration Logic:
1. User enters token in login form
2. Frontend calls `loginWithToken` which:
   - Authenticates with backend
   - Registers current device
   - Retrieves device list
   - Falls back to localStorage if backend fails
3. Device limit is enforced by backend (max 2 devices)

### 2. Case Data Management

#### Frontend Changes:
- Modified `App.tsx` to load cases from backend
- Updated case creation to save to backend
- Added backend synchronization for updates

#### Backend Endpoints Used:
- `GET /api/cases/` - Get all cases
- `POST /api/cases/create/` - Create new case
- `PUT /api/cases/{case_id}/update/` - Update case
- `DELETE /api/cases/{case_id}/delete/` - Delete case

#### Integration Logic:
1. On authentication, frontend loads cases from backend
2. When creating a new case:
   - AI analysis is performed locally
   - Case data is saved to backend
   - Falls back to localStorage if backend fails
3. When updating cases:
   - Changes are synchronized with backend
   - Backend errors are logged but don't block UI

### 3. Case Sub-entities Management

#### Frontend Changes:
- Updated various view components to save data to backend
- Added specific API calls for each entity type

#### Backend Endpoints Used:
- `POST /api/cases/{case_id}/files/add/` - Add file to case
- `POST /api/cases/{case_id}/participants/add/` - Add participant to case
- `POST /api/cases/{case_id}/tasks/add/` - Add task to case
- `PUT /api/cases/{case_id}/tasks/{task_id}/update/` - Update task
- `POST /api/cases/{case_id}/timeline/add/` - Add timeline event
- `POST /api/cases/{case_id}/evidence/add/` - Add evidence
- `POST /api/cases/{case_id}/billing/add/` - Add billing entry
- `POST /api/cases/{case_id}/notes/add/` - Add note

#### Integration Logic:
1. Each view component (Tasks, Timeline, Evidence, etc.) saves data to backend
2. New entities are created via POST requests
3. Updates are sent via PUT requests
4. Backend errors are logged but don't block UI

### 4. Profile Management

#### Frontend Changes:
- Modified `SettingsView.tsx` to integrate with backend
- Added profile editing capabilities

#### Backend Endpoints Used:
- `GET /api/users/profile/` - Get user profile
- `PUT /api/users/profile/update/` - Update user profile

#### Integration Logic:
1. Profile data is loaded when Settings view is opened
2. Users can edit their profile information
3. Changes are saved to backend via PUT request

## API Service Implementation

The `apiService.ts` file provides a centralized service for all backend communication:

### Key Features:
1. **Authentication Management**: Automatically adds JWT tokens to requests
2. **Error Handling**: Consistent error handling across all API calls
3. **Request Helpers**: Simplified API request functions
4. **Type Safety**: TypeScript interfaces for all data structures

### Main Functions:
- `loginWithToken(token: string)` - Authenticate user
- `getProfile()` - Get user profile
- `updateProfile(profileData)` - Update user profile
- `getCases()` - Get all cases for user
- `createCase(caseData)` - Create new case
- `updateCase(caseId, caseData)` - Update existing case
- `deleteCase(caseId)` - Delete case
- `getUserDevices()` - Get user's registered devices
- `registerDevice(deviceId, deviceName)` - Register new device
- `removeDevice(deviceId)` - Remove device
- Entity-specific functions for files, participants, tasks, etc.

## Data Synchronization Strategy

### Online Mode:
1. All data operations are sent to backend
2. UI is updated immediately for responsiveness
3. Backend errors are logged but don't block user experience

### Offline/Fallback Mode:
1. If backend is unreachable, data is stored in localStorage
2. When connection is restored, data synchronization can be implemented
3. Current implementation prioritizes user experience over strict consistency

## Device Management

### Implementation:
1. Device ID is generated based on browser fingerprint
2. Devices are registered with backend on login
3. Backend enforces 2-device limit
4. Users can remove devices through Settings view

### Fallback:
1. If backend device management fails, localStorage is used
2. Device limit is enforced client-side as backup

## Error Handling

### Network Errors:
- Logged to console
- User notified through alerts for critical operations
- Fallback to localStorage when backend is unreachable

### Authentication Errors:
- Automatic logout on token expiration
- Redirect to login page
- Clear local storage

### Data Errors:
- Validation errors are displayed to user
- Invalid data is not saved
- User can retry operations

## Security Considerations

### Authentication:
- JWT tokens are used for all authenticated requests
- Tokens are stored in memory (not localStorage) for better security
- HTTPS should be used in production

### Data Protection:
- Sensitive data is not stored in localStorage
- All communication should be encrypted in production
- Device IDs are generated client-side

## Future Improvements

### Enhanced Synchronization:
- Implement offline-first approach with sync queue
- Add conflict resolution for offline edits
- Provide sync status indicators

### Performance Optimizations:
- Add request caching
- Implement pagination for large datasets
- Add data compression for large payloads

### Enhanced Error Handling:
- Add retry mechanisms for failed requests
- Implement more granular error messages
- Add offline notification system

## Testing

### Manual Testing:
1. Login with valid token
2. Verify device registration
3. Create new case and verify backend storage
4. Update case data and verify synchronization
5. Test device limit enforcement
6. Test profile management
7. Test all case sub-entities (tasks, timeline, etc.)

### Automated Testing:
- Integration tests for API endpoints
- Unit tests for service functions
- End-to-end tests for critical user flows

## Deployment Considerations

### Environment Variables:
- `API_BASE_URL` should be configurable for different environments
- JWT token storage strategy should be reviewed for production

### CORS Configuration:
- Ensure backend allows requests from frontend origin
- Configure appropriate headers for security

### SSL/TLS:
- All communication should be encrypted in production
- Certificate management for secure connections

## Conclusion

The integration successfully connects the React frontend with the Django backend, providing:
- Secure user authentication
- Persistent case data storage
- Device management with limit enforcement
- Profile management capabilities
- Robust error handling and fallback mechanisms

The implementation maintains the existing user experience while adding backend persistence and device management features.