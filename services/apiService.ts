import type { 
  Case, CaseFile, CaseParticipant, Task, TimelineEvent, 
  EvidenceItem, BillingEntry, Note, DebateResult 
} from '../types';

// API base URL - in production this should be configurable
const API_BASE_URL = 'http://localhost:8000/api';

// Auth token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => {
  return authToken;
};

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };
  
  // Add auth header if token exists
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const config: RequestInit = {
    ...options,
    headers,
  };
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
};

// Auth API
export const loginWithToken = async (token: string) => {
  const response = await apiRequest('/users/login/', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  
  if (response.access) {
    setAuthToken(response.access);
  }
  
  return response;
};

export const logout = async () => {
  // In a real implementation, you might want to call the backend logout endpoint
  setAuthToken(null);
  return { message: 'Successfully logged out' };
};

// User Profile API
export const getProfile = async () => {
  return await apiRequest('/users/profile/', {
    method: 'GET',
  });
};

export const updateProfile = async (profileData: Partial<{ 
  username: string; 
  email: string; 
  phone_number: string; 
  full_name: string 
}>) => {
  return await apiRequest('/users/profile/update/', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// Device API
export const getUserDevices = async () => {
  return await apiRequest('/users/devices/', {
    method: 'GET',
  });
};

export const registerDevice = async (deviceId: string, deviceName?: string) => {
  return await apiRequest('/users/devices/register/', {
    method: 'POST',
    body: JSON.stringify({ 
      device_id: deviceId, 
      name: deviceName || 'Unknown Device' 
    }),
  });
};

export const removeDevice = async (deviceId: string) => {
  return await apiRequest(`/users/devices/remove/${deviceId}/`, {
    method: 'DELETE',
  });
};

// Cases API
export const getCases = async () => {
  return await apiRequest('/cases/', {
    method: 'GET',
  });
};

export const createCase = async (caseData: Omit<Case, 'id' | 'user' | 'created_at' | 'updated_at'> & { id: string }) => {
  // Prepare case data for API
  const apiCaseData = {
    id: caseData.id,
    title: caseData.title,
    case_details: caseData.caseDetails,
    court_stage: caseData.courtStage,
    client_role: caseData.clientRole,
    client_name: caseData.clientName,
    tags: caseData.tags,
    folder: caseData.folder,
    timestamp: caseData.timestamp,
  };
  
  return await apiRequest('/cases/create/', {
    method: 'POST',
    body: JSON.stringify(apiCaseData),
  });
};

export const getCase = async (caseId: string) => {
  return await apiRequest(`/cases/${caseId}/`, {
    method: 'GET',
  });
};

export const updateCase = async (caseId: string, caseData: Partial<Case>) => {
  // Prepare case data for API
  const apiCaseData: any = {};
  
  if (caseData.title !== undefined) apiCaseData.title = caseData.title;
  if (caseData.caseDetails !== undefined) apiCaseData.case_details = caseData.caseDetails;
  if (caseData.courtStage !== undefined) apiCaseData.court_stage = caseData.courtStage;
  if (caseData.clientRole !== undefined) apiCaseData.client_role = caseData.clientRole;
  if (caseData.clientName !== undefined) apiCaseData.client_name = caseData.clientName;
  if (caseData.tags !== undefined) apiCaseData.tags = caseData.tags;
  if (caseData.folder !== undefined) apiCaseData.folder = caseData.folder;
  if (caseData.timestamp !== undefined) apiCaseData.timestamp = caseData.timestamp;
  
  return await apiRequest(`/cases/${caseId}/update/`, {
    method: 'PUT',
    body: JSON.stringify(apiCaseData),
  });
};

export const deleteCase = async (caseId: string) => {
  return await apiRequest(`/cases/${caseId}/delete/`, {
    method: 'DELETE',
  });
};

// Case Files API
export const addCaseFile = async (caseId: string, fileData: CaseFile) => {
  const apiFileData = {
    id: fileData.id,
    name: fileData.name,
    file_type: fileData.type,
    extracted_text: fileData.extractedText,
    document_type: fileData.documentType,
  };
  
  return await apiRequest(`/cases/${caseId}/files/add/`, {
    method: 'POST',
    body: JSON.stringify(apiFileData),
  });
};

// New method for uploading binary files
export const uploadCaseFile = async (caseId: string, file: File, fileData: Partial<CaseFile> = {}) => {
  const formData = new FormData();
  
  // Add file data as JSON
  formData.append('file_data', JSON.stringify({
    id: fileData.id || `file-${Date.now()}`,
    name: fileData.name || file.name,
    file_type: fileData.type || file.type,
    extracted_text: fileData.extractedText || '',
    document_type: fileData.documentType || 'Audio Memo',
  }));
  
  // Add the actual file
  formData.append('file', file);
  
  const url = `${API_BASE_URL}/cases/${caseId}/files/upload/`;
  
  const headers: any = {};
  
  // Add auth header if token exists
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers, // Don't set Content-Type, let browser set it with boundary
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`File upload failed for ${url}:`, error);
    throw error;
  }
};

// Case Participants API
export const addCaseParticipant = async (caseId: string, participant: CaseParticipant) => {
  return await apiRequest(`/cases/${caseId}/participants/add/`, {
    method: 'POST',
    body: JSON.stringify(participant),
  });
};

// Tasks API
export const addTask = async (caseId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
  const apiTaskData = {
    text: task.text,
    completed: task.completed,
  };
  
  return await apiRequest(`/cases/${caseId}/tasks/add/`, {
    method: 'POST',
    body: JSON.stringify(apiTaskData),
  });
};

export const updateTask = async (caseId: string, taskId: string, taskData: Partial<Task>) => {
  const apiTaskData: any = {};
  
  if (taskData.text !== undefined) apiTaskData.text = taskData.text;
  if (taskData.completed !== undefined) apiTaskData.completed = taskData.completed;
  
  return await apiRequest(`/cases/${caseId}/tasks/${taskId}/update/`, {
    method: 'PUT',
    body: JSON.stringify(apiTaskData),
  });
};

// Timeline Events API
export const addTimelineEvent = async (caseId: string, event: Omit<TimelineEvent, 'id' | 'created_at'> & { id?: string }) => {
  const apiEventData = {
    date: event.date,
    description: event.description,
    event_type: event.type,
  };
  
  return await apiRequest(`/cases/${caseId}/timeline/add/`, {
    method: 'POST',
    body: JSON.stringify(apiEventData),
  });
};

// Evidence API
export const addEvidence = async (caseId: string, evidence: Omit<EvidenceItem, 'id' | 'created_at'> & { id?: string }) => {
  const apiEvidenceData = {
    file_id: evidence.fileId,
    name: evidence.name,
    evidence_type: evidence.type,
    ai_summary: evidence.aiSummary,
    timestamp: evidence.timestamp,
  };
  
  return await apiRequest(`/cases/${caseId}/evidence/add/`, {
    method: 'POST',
    body: JSON.stringify(apiEvidenceData),
  });
};

// Billing API
export const addBillingEntry = async (caseId: string, billing: Omit<BillingEntry, 'id' | 'created_at'> & { id?: string }) => {
  const apiBillingData = {
    date: billing.date,
    hours: billing.hours,
    description: billing.description,
    rate: billing.rate,
  };
  
  return await apiRequest(`/cases/${caseId}/billing/add/`, {
    method: 'POST',
    body: JSON.stringify(apiBillingData),
  });
};

// Notes API
export const addNote = async (caseId: string, note: Omit<Note, 'id' | 'created_at'> & { id?: string }) => {
  const apiNoteData = {
    content: note.content,
    timestamp: note.timestamp,
  };
  
  return await apiRequest(`/cases/${caseId}/notes/add/`, {
    method: 'POST',
    body: JSON.stringify(apiNoteData),
  });
};