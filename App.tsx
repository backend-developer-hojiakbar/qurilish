import React, { useState, useCallback, useEffect } from 'react';
import { translations } from './translations';
import type { View, Case, CaseFile, CaseParticipant, PendingCaseData, FeedbackData, Task, TimelineEvent, EvidenceItem, BillingEntry, Note } from './types';

// Components
import { Navigation } from './components/Navigation';
import { CaseNavigation } from './components/CaseNavigation';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CaseInputForm } from './components/CaseInputForm';
import { AiDebateView } from './components/AiDebateView';
import { SummaryView } from './components/SummaryView';
import { HistoryView } from './components/HistoryView';
import { ResearchView } from './components/ResearchView';
import { SettingsView } from './components/SettingsView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { SimulationView } from './components/SimulationView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ParticipantEditorModal } from './components/ParticipantEditorModal';
import { PricingView } from './components/PricingView';
import { FeedbackModal } from './components/FeedbackModal';
import { TasksView } from './components/TasksView';
import { DocumentGeneratorView } from './components/DocumentGeneratorView';
import { TimelineView } from './components/TimelineView';
import { EvidenceView } from './components/EvidenceView';
import { BillingView } from './components/BillingView';
import { NotesView } from './components/NotesView';
import { CalendarView } from './components/CalendarView';

// Services
import { 
    getLegalStrategy, 
    getCaseParticipants, 
    getDeepDiveAnalysis, 
    getCourtroomScenario, 
    getCrossExaminationQuestions, 
    getClosingArgument 
} from './services/geminiService';
import { 
    loginWithToken, 
    logout, 
    getCases, 
    createCase, 
    updateCase, 
    deleteCase,
    registerDevice,
    getUserDevices,
    removeDevice,
    addCaseFile,
    addCaseParticipant,
    addTask,
    updateTask,
    addTimelineEvent,
    addEvidence,
    addBillingEntry,
    addNote
} from './services/apiService';

// Icons for Header
import { AnalysisIcon, DashboardIcon, HistoryIcon, ResearchIcon, SettingsIcon, DatabaseIcon, TheaterIcon, DebateIcon, StrategyIcon, CheckBadgeIcon, DocumentTextIcon, CalendarIcon, BeakerIcon, CurrencyDollarIcon, PencilSquareIcon } from './components/icons';

// Hooks for translation and theme
const useTranslation = () => {
    const [language, setLanguage] = useState<string>(() => {
        const savedLang = localStorage.getItem('language');
        return savedLang || 'uz-lat';
    });

    const t = useCallback((key: string, replacements?: { [key: string]: string }) => {
        let translation = translations[language]?.[key] || translations['en']?.[key] || key;
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = translation.replace(new RegExp(`{{${rKey}}}`, 'g'), replacements[rKey]);
            });
        }
        return translation;
    }, [language]);

    return { t, setLanguage, language };
};

const useTheme = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        return savedTheme || 'dark';
    });

    useEffect(() => {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(theme === 'light' ? 'light-mode' : 'dark-mode');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return { theme, toggleTheme };
};

const generateDeviceId = () => {
  const navigatorInfo = window.navigator;
  const screenInfo = window.screen;
  let fingerprint = '';

  fingerprint += navigatorInfo.userAgent;
  fingerprint += screenInfo.height + 'x' + screenInfo.width;
  fingerprint += navigatorInfo.language;
  fingerprint += new Date().getTimezoneOffset();
  fingerprint += navigatorInfo.hardwareConcurrency;
  fingerprint += navigatorInfo.platform;

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const deviceId = `DEV-${Math.abs(hash).toString(16).toUpperCase()}`;
  return deviceId;
};

const App: React.FC = () => {
    const { t, setLanguage, language } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [deviceList, setDeviceList] = useState<string[]>([]);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isBackendConnected, setIsBackendConnected] = useState(false);

    // Store the previous language to detect changes
    const [previousLanguage, setPreviousLanguage] = useState<string>(language);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Initial load effect
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const identifier = localStorage.getItem('deviceIdentifier');
        if (token && identifier) {
            const deviceListKey = `deviceList_${token}`;
            const storedDeviceList = localStorage.getItem(deviceListKey);
            const currentDeviceList = storedDeviceList ? JSON.parse(storedDeviceList) : [];
            
            setAuthToken(token);
            setDeviceId(identifier);
            setDeviceList(currentDeviceList);
        }
    }, []);

    // Load cases from backend when authenticated
    useEffect(() => {
        const loadCasesFromBackend = async () => {
            if (authToken) {
                try {
                    const backendCases = await getCases();
                    // Convert backend case format to frontend format
                    const convertedCases = backendCases.map((backendCase: any) => ({
                        id: backendCase.id,
                        title: backendCase.title,
                        caseDetails: backendCase.case_details,
                        files: backendCase.files || [],
                        result: backendCase.debate_result || {},
                        courtStage: backendCase.court_stage,
                        clientRole: backendCase.client_role,
                        clientName: backendCase.client_name,
                        participants: backendCase.participants || [],
                        tasks: backendCase.tasks || [],
                        timeline: backendCase.timeline || [],
                        evidence: backendCase.evidence || [],
                        billing: backendCase.billing || [],
                        notes: backendCase.notes || [],
                        tags: backendCase.tags || [],
                        folder: backendCase.folder,
                        timestamp: backendCase.timestamp,
                        language: backendCase.language || 'uz-lat', // Default to uz-lat if not set
                    }));
                    setHistory(convertedCases);
                    setIsBackendConnected(true);
                } catch (error) {
                    console.error("Failed to load cases from backend:", error);
                    setIsBackendConnected(false);
                }
            }
        };

        loadCasesFromBackend();
    }, [authToken]);

    // Function to regenerate AI content for a case in the current language
    const handleRegenerateAiContent = async (caseToRegenerate: Case) => {
        setIsRegenerating(true);
        setIsLoading(true);
        try {
            // Regenerate the main legal strategy
            const result = await getLegalStrategy(
                caseToRegenerate.caseDetails,
                caseToRegenerate.files,
                caseToRegenerate.tags[0], // courtType
                caseToRegenerate.courtStage,
                caseToRegenerate.clientRole,
                caseToRegenerate.clientName,
                caseToRegenerate.participants,
                t
            );

            // Update the case with new AI-generated content
            const updatedCase: Case = {
                ...caseToRegenerate,
                result: { ...caseToRegenerate.result, ...result },
                language: language // Update the language
            };

            updateCaseInHistory(updatedCase);
            setCurrentCase(updatedCase);
        } catch (error: any) {
            alert(t(error.message) || t('error_full_analysis'));
        } finally {
            setIsLoading(false);
            setIsRegenerating(false);
        }
    };

    const [activeView, setActiveView] = useState<View>('dashboard');
    const [activeCaseView, setActiveCaseView] = useState<View>('knowledge_base');

    const [history, setHistory] = useState<Case[]>(() => {
        try {
            const savedHistory = localStorage.getItem('caseHistory');
            return savedHistory ? JSON.parse(savedHistory) : [];
        } catch (e) {
            console.error("Failed to parse case history:", e);
            return [];
        }
    });
    const [currentCase, setCurrentCase] = useState<Case | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [pendingCaseData, setPendingCaseData] = useState<PendingCaseData | null>(null);
    const [initialResearchQuery, setInitialResearchQuery] = useState<string | null>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    // Save cases to localStorage as fallback
    useEffect(() => {
        localStorage.setItem('caseHistory', JSON.stringify(history));
    }, [history]);

    // Detect language changes and handle AI content regeneration
    useEffect(() => {
        // Only process if language actually changed and we're not already regenerating
        if (language !== previousLanguage && !isRegenerating) {
            // Language has changed, we need to update the current case if it exists
            if (currentCase) {
                // Show a notification or confirmation dialog to the user
                const shouldRegenerate = window.confirm(
                    t('language_change_confirmation')
                );
                
                if (shouldRegenerate) {
                    // Regenerate AI content for the current case in the new language
                    handleRegenerateAiContent(currentCase);
                }
            }
            
            // Update previous language
            setPreviousLanguage(language);
        }
    }, [language, previousLanguage, currentCase, t, isRegenerating]);

    const handleNavigate = useCallback((view: View) => {
        const globalViews: View[] = ['dashboard', 'analyze', 'history', 'research', 'settings', 'calendar'];
        if (globalViews.includes(view)) {
            setCurrentCase(null);
        }
        setActiveView(view);
    }, []);

    const handleLogin = useCallback(async (token: string) => {
        setLoginError(null);
        try {
            // Try backend login first
            const loginResponse = await loginWithToken(token);
            
            const identifier = generateDeviceId();
            
            // Register device with backend
            try {
                await registerDevice(identifier, 'Web Browser');
                // Get updated device list
                const devices = await getUserDevices();
                const deviceIds = devices.map((d: any) => d.device_id);
                
                localStorage.setItem('authToken', token);
                localStorage.setItem('deviceIdentifier', identifier);
                setAuthToken(token);
                setDeviceId(identifier);
                setDeviceList(deviceIds);
            } catch (deviceError) {
                console.error("Device registration failed:", deviceError);
                // Fallback to localStorage if backend device management fails
                const deviceListKey = `deviceList_${token}`;
                const storedDeviceList = localStorage.getItem(deviceListKey);
                let currentDeviceList: string[] = storedDeviceList ? JSON.parse(storedDeviceList) : [];

                if (currentDeviceList.includes(identifier)) {
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('deviceIdentifier', identifier);
                    setAuthToken(token);
                    setDeviceId(identifier);
                    setDeviceList(currentDeviceList);
                } else {
                    if (currentDeviceList.length < 2) {
                        currentDeviceList.push(identifier);
                        localStorage.setItem(deviceListKey, JSON.stringify(currentDeviceList));
                        localStorage.setItem('authToken', token);
                        localStorage.setItem('deviceIdentifier', identifier);
                        setAuthToken(token);
                        setDeviceId(identifier);
                        setDeviceList(currentDeviceList);
                    } else {
                        setLoginError(t('login_error_device_limit'));
                        return;
                    }
                }
            }
        } catch (error: any) {
            console.error("Login failed:", error);
            setLoginError(error.message || t('error_api_unknown'));
        }
    }, [t]);

    const handleLogout = useCallback(async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout error:", error);
        }
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('deviceIdentifier');
        setAuthToken(null);
        setDeviceId(null);
        setDeviceList([]);
        handleNavigate('dashboard');
    }, [handleNavigate]);

    const handleRemoveDevice = useCallback(async (deviceToRemove: string) => {
        if (!authToken) return;

        try {
            // Try backend device removal first
            await removeDevice(deviceToRemove);
            // Get updated device list
            const devices = await getUserDevices();
            const deviceIds = devices.map((d: any) => d.device_id);
            setDeviceList(deviceIds);
            
            if (deviceToRemove === deviceId) {
                handleLogout();
            }
        } catch (error) {
            console.error("Backend device removal failed, falling back to localStorage:", error);
            // Fallback to localStorage if backend fails
            const deviceListKey = `deviceList_${authToken}`;
            const updatedList = deviceList.filter(id => id !== deviceToRemove);
            
            localStorage.setItem(deviceListKey, JSON.stringify(updatedList));
            setDeviceList(updatedList);
            
            if (deviceToRemove === deviceId) {
                handleLogout();
            }
        }
    }, [authToken, deviceId, deviceList, handleLogout]);

    const handleAnalyze = useCallback(async (courtType: string, caseDetails: string, files: CaseFile[], courtStage: string) => {
        setIsLoading(true);
        try {
            const participants = await getCaseParticipants(caseDetails, files, t);
            const suggestedParticipants = participants.map(p => ({ name: p.name, role: p.suggestedRole }));
            setPendingCaseData({ caseDetails, files, courtType, courtStage, participants: suggestedParticipants, clientRole: '', clientName: '' });
            setIsLoading(false);
        } catch (error: any) {
            alert(t(error.message) || t('error_participant_analysis'));
            setIsLoading(false);
        }
    }, [t]);

    const handleConfirmParticipantsAndAnalyze = useCallback(async (participants: CaseParticipant[], client: {name: string, role: string}) => {
        if (!pendingCaseData) return;
        
        setIsLoading(true);
        
        try {
            const { courtType, caseDetails, files, courtStage } = pendingCaseData;
            const { name: clientName, role: clientRole } = client;

            const result = await getLegalStrategy(
                caseDetails, files, courtType, 
                courtStage, clientRole, clientName, participants, t
            );
            
            let newTitle = '';
            let opponentName = '';
            const plaintiffRole = t('client_role_davogar');
            const defendantRole = t('client_role_javobgar');
            const victimRole = t('client_role_jabrlanuvchi');
            const accusedRole = t('client_role_sudlanuvchi');
            if (clientRole === plaintiffRole) opponentName = participants.find(p => p.role === defendantRole)?.name || '';
            else if (clientRole === defendantRole) opponentName = participants.find(p => p.role === plaintiffRole)?.name || '';
            else if (clientRole === accusedRole) opponentName = participants.find(p => p.role === victimRole)?.name || '';
            else if (clientRole === victimRole) opponentName = participants.find(p => p.role === accusedRole)?.name || '';
            if (!opponentName) opponentName = participants.find(p => p.name !== clientName && p.role !== t('client_role_guvoh') && p.role !== t('client_role_boshqa'))?.name || '';
            if (opponentName) newTitle = t('case_title_vs_template', { clientName, opponentName });
            else newTitle = `${t(`court_type_${courtType.toLowerCase().replace("'", "")}`)}: ${t('case_title_template', { clientName })}`;

            const newCase: Case = {
                id: `case-${Date.now()}`,
                title: newTitle,
                caseDetails: caseDetails,
                files: files.map(({content, ...rest}) => rest),
                result,
                courtStage: courtStage,
                clientRole: clientRole,
                clientName: clientName,
                participants,
                tasks: result.suggestedTasks.map((taskText, index) => ({ id: `task-${Date.now()}-${index}`, text: taskText, completed: false })),
                timeline: [],
                evidence: [],
                billing: [],
                notes: [],
                tags: [courtType, courtStage],
                folder: null,
                timestamp: new Date().toISOString(),
                language: language // Store the language used for this case
            };

            // Save to backend if connected
            if (isBackendConnected) {
                try {
                    await createCase(newCase);
                } catch (error) {
                    console.error("Failed to save case to backend:", error);
                }
            }

            setHistory(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)]);
            setCurrentCase(newCase);
            setActiveView('knowledge_base');
            setActiveCaseView('knowledge_base');

        } catch (error: any) {
            alert(t(error.message) || t('error_full_analysis'));
        } finally {
            setIsLoading(false);
            setPendingCaseData(null);
        }
    }, [pendingCaseData, t, isBackendConnected, language]);

    const handleSelectCase = useCallback((selectedCase: Case) => {
        setCurrentCase(selectedCase);
        setActiveView('knowledge_base');
        setActiveCaseView('knowledge_base');
    }, []);
    
    const updateCaseInHistory = (updatedCase: Case) => {
        // Ensure the language is preserved when updating a case
        const caseWithLanguage: Case = {
            ...updatedCase,
            language: updatedCase.language || language
        };
        
        setCurrentCase(caseWithLanguage);
        setHistory(prev => prev.map(c => c.id === caseWithLanguage.id ? caseWithLanguage : c));
        
        // Update in backend if connected
        if (isBackendConnected) {
            updateCase(caseWithLanguage.id, caseWithLanguage).catch(error => {
                console.error("Failed to update case in backend:", error);
            });
        }
    };

    const handleDeleteCase = useCallback(async (id: string) => {
        // Delete from backend if connected
        if (isBackendConnected) {
            try {
                await deleteCase(id);
            } catch (error) {
                console.error("Failed to delete case from backend:", error);
            }
        }
        
        setHistory(prev => prev.filter(c => c.id !== id));
        if (currentCase?.id === id) {
            handleNavigate('dashboard');
        }
    }, [currentCase, handleNavigate, isBackendConnected]);
    
    const handleNewAnalysis = () => {
        handleNavigate('analyze');
    };

    const handleRateDebate = useCallback((debateIndex: number, rating: 'up' | 'down') => {
        if (!currentCase) return;
        const updatedResult = { ...currentCase.result };
        updatedResult.debate[debateIndex].rating = rating;
        const updatedCase = { ...currentCase, result: updatedResult };
        updateCaseInHistory(updatedCase);
    }, [currentCase]);

    const handleArticleSelect = (article: string) => {
        setInitialResearchQuery(t('research_query_template', { article }));
        handleNavigate('research');
    };
    
    const handleGetDeepDive = useCallback(async () => {
        if (!currentCase) return;
        setIsDeepDiveLoading(true);
        try {
            const analysis = await getDeepDiveAnalysis(currentCase.caseDetails, currentCase.files, currentCase.tags[0], currentCase.courtStage, currentCase.clientRole, currentCase.clientName, currentCase.participants, t);
            const updatedCase = { 
                ...currentCase, 
                result: { ...currentCase.result, deepDiveAnalysis: analysis },
                language: language // Update the language when regenerating deep dive
            };
            updateCaseInHistory(updatedCase);
        } catch (error: any) {
            alert(t(error.message) || t('error_full_analysis'));
        } finally {
            setIsDeepDiveLoading(false);
        }
    }, [currentCase, t, language]);

    const handleUpdateCase = useCallback(async (caseId: string, additionalDetails: string, newFiles: CaseFile[]) => {
        if (!currentCase || currentCase.id !== caseId) return;
        setIsUpdating(true);
        const combinedDetails = `${currentCase.caseDetails}\n\n--- YANGILANISH ---\n${additionalDetails}`;
        const combinedFiles = [...currentCase.files, ...newFiles];

        try {
            const result = await getLegalStrategy(combinedDetails, combinedFiles, currentCase.tags[0], currentCase.courtStage, currentCase.clientRole, currentCase.clientName, currentCase.participants, t);
            const updatedCase: Case = {
                ...currentCase,
                caseDetails: combinedDetails,
                files: combinedFiles.map(({ content, ...rest }) => rest),
                result: { ...currentCase.result, ...result },
                timestamp: new Date().toISOString(),
                language: language // Update the language when updating case
            };
            updateCaseInHistory(updatedCase);
        } catch (error: any) {
            alert(t(error.message) || t('error_update_analysis'));
        } finally {
            setIsUpdating(false);
        }
    }, [currentCase, t, language]);

    const handleSimulation = useCallback(async () => {
        if (!currentCase) return;
        setIsSimulating(true);
        try {
            const [scenario, questions, closingLead, closingDefender] = await Promise.all([
                getCourtroomScenario(currentCase.caseDetails, currentCase.files, currentCase.tags[0], currentCase.courtStage, currentCase.clientRole, currentCase.clientName, currentCase.participants, t),
                getCrossExaminationQuestions(currentCase.caseDetails, currentCase.files, currentCase.tags[0], currentCase.courtStage, currentCase.clientRole, currentCase.clientName, currentCase.participants, t),
                getClosingArgument(currentCase.caseDetails, currentCase.files, currentCase.tags[0], currentCase.courtStage, currentCase.clientRole, currentCase.clientName, currentCase.participants, 'lead', t),
                getClosingArgument(currentCase.caseDetails, currentCase.files, currentCase.tags[0], currentCase.courtStage, currentCase.clientRole, currentCase.clientName, currentCase.participants, 'defender', t),
            ]);
            const updatedCase = { 
                ...currentCase, 
                result: { 
                    ...currentCase.result, 
                    courtroomScenario: scenario, 
                    crossExaminationQuestions: questions, 
                    closingArgumentLead: closingLead, 
                    closingArgumentDefender: closingDefender 
                },
                language: language // Update the language when regenerating simulation
            };
            updateCaseInHistory(updatedCase);
        } catch (error: any) {
            alert(t(error.message) || t('error_simulation_analysis'));
        } finally {
            setIsSimulating(false);
        }
    }, [currentCase, t, language]);

    const handleUpdateTasks = async (newTasks: Task[]) => {
        if (!currentCase) return;
        
        // Update in backend if connected
        if (isBackendConnected) {
            try {
                // Add new tasks to backend
                for (const task of newTasks) {
                    if (!currentCase.tasks.some(t => t.id === task.id)) {
                        await addTask(currentCase.id, task);
                    } else if (currentCase.tasks.some(t => t.id === task.id && (t.text !== task.text || t.completed !== task.completed))) {
                        // Update existing task
                        const existingTask = currentCase.tasks.find(t => t.id === task.id);
                        if (existingTask) {
                            await updateTask(currentCase.id, task.id, task);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to update tasks in backend:", error);
            }
        }
        
        updateCaseInHistory({ ...currentCase, tasks: newTasks });
    };
    
    const handleUpdateTimeline = async (newTimeline: TimelineEvent[]) => {
        if (!currentCase) return;
        
        // Update in backend if connected
        if (isBackendConnected) {
            try {
                // Add new timeline events to backend
                for (const event of newTimeline) {
                    if (!currentCase.timeline.some(t => t.date === event.date && t.description === event.description)) {
                        await addTimelineEvent(currentCase.id, event);
                    }
                }
            } catch (error) {
                console.error("Failed to update timeline in backend:", error);
            }
        }
        
        updateCaseInHistory({ ...currentCase, timeline: newTimeline });
    };
    
    const handleUpdateEvidence = async (newEvidence: EvidenceItem[]) => {
        if (!currentCase) return;
        
        // Update in backend if connected
        if (isBackendConnected) {
            try {
                // Add new evidence to backend
                for (const evidence of newEvidence) {
                    if (!currentCase.evidence.some(e => e.id === evidence.id)) {
                        await addEvidence(currentCase.id, evidence);
                    }
                }
            } catch (error) {
                console.error("Failed to update evidence in backend:", error);
            }
        }
        
        updateCaseInHistory({ ...currentCase, evidence: newEvidence });
    };
    
    const handleUpdateBilling = async (newBilling: BillingEntry[]) => {
        if (!currentCase) return;
        
        // Update in backend if connected
        if (isBackendConnected) {
            try {
                // Add new billing entries to backend
                for (const billing of newBilling) {
                    if (!currentCase.billing.some(b => b.id === billing.id)) {
                        await addBillingEntry(currentCase.id, billing);
                    }
                }
            } catch (error) {
                console.error("Failed to update billing in backend:", error);
            }
        }
        
        updateCaseInHistory({ ...currentCase, billing: newBilling });
    };
    
    const handleUpdateNotes = async (newNotes: Note[]) => {
        if (!currentCase) return;
        
        // Update in backend if connected
        if (isBackendConnected) {
            try {
                // Add new notes to backend
                for (const note of newNotes) {
                    if (!currentCase.notes.some(n => n.id === note.id)) {
                        await addNote(currentCase.id, note);
                    }
                }
            } catch (error) {
                console.error("Failed to update notes in backend:", error);
            }
        }
        
        updateCaseInHistory({ ...currentCase, notes: newNotes });
    };

    const handleSetCaseFolder = async (caseId: string, folder: string | null) => {
        // Update in backend if connected
        if (isBackendConnected) {
            try {
                await updateCase(caseId, { folder });
            } catch (error) {
                console.error("Failed to update case folder in backend:", error);
            }
        }
        
        setHistory(prev => prev.map(c => c.id === caseId ? { ...c, folder } : c));
    };

    const currentGlobalView = currentCase ? activeCaseView : activeView;

    const VIEW_DATA: { [key in View]?: { title: string; description: string; icon: React.ReactElement } } = {
        dashboard: { title: t('view_dashboard_title'), description: t('view_dashboard_description'), icon: <DashboardIcon /> },
        analyze: { title: t('view_analyze_title'), description: t('view_analyze_description'), icon: <AnalysisIcon /> },
        history: { title: t('view_history_title'), description: t('view_history_description'), icon: <HistoryIcon /> },
        research: { title: t('view_research_title'), description: t('view_research_description'), icon: <ResearchIcon /> },
        calendar: { title: t('view_calendar_title'), description: t('view_calendar_description'), icon: <CalendarIcon /> },
        settings: { title: t('view_settings_title'), description: t('view_settings_description'), icon: <SettingsIcon /> },
        knowledge_base: { title: currentCase?.courtStage === t('court_stage_tergov_raw') ? t('view_investigation_materials_title') : t('view_knowledge_base_title'), description: currentCase?.courtStage === t('court_stage_tergov_raw') ? t('view_investigation_materials_description') : t('view_knowledge_base_description'), icon: <DatabaseIcon /> },
        timeline: { title: t('view_timeline_title'), description: t('view_timeline_description'), icon: <HistoryIcon /> },
        evidence: { title: t('view_evidence_title'), description: t('view_evidence_description'), icon: <BeakerIcon /> },
        tasks: { title: t('view_tasks_title'), description: t('view_tasks_description'), icon: <CheckBadgeIcon/> },
        documents: { title: t('view_documents_title'), description: t('view_documents_description'), icon: <DocumentTextIcon/> },
        notes: { title: t('view_notes_title'), description: t('view_notes_description'), icon: <PencilSquareIcon /> },
        billing: { title: t('view_billing_title'), description: t('view_billing_description'), icon: <CurrencyDollarIcon /> },
        simulation: { title: t('view_simulation_title'), description: t('view_simulation_description'), icon: <TheaterIcon /> },
        debate: { title: currentCase?.courtStage === t('court_stage_tergov_raw') ? t('view_investigation_debate_title') : t('view_debate_title'), description: currentCase?.courtStage === t('court_stage_tergov_raw') ? t('view_investigation_debate_description') : t('view_debate_description'), icon: <DebateIcon /> },
        summary: { title: currentCase?.courtStage === t('court_stage_tergov_raw') ? t('view_investigation_summary_title') : t('view_summary_title'), description: currentCase?.courtStage === t('court_stage_tergov_raw') ? t('view_investigation_summary_description') : t('view_summary_description'), icon: <StrategyIcon /> },
    };
    
    if (!authToken) {
        return <PricingView onLogin={handleLogin} t={t} loginError={loginError} />;
    }
    
    const renderActiveView = () => {
        const viewToRender = currentCase ? activeCaseView : activeView;
        switch (viewToRender) {
            case 'dashboard': return <DashboardView onStartAnalysis={handleNewAnalysis} cases={history} onNavigate={handleNavigate} onSelectCase={handleSelectCase} t={t} language={language} />;
            case 'analyze': return <CaseInputForm onAnalyze={handleAnalyze} isLoading={isLoading} t={t} />;
            case 'history': return <HistoryView history={history} onSelect={handleSelectCase} onDelete={handleDeleteCase} onSetFolder={handleSetCaseFolder} t={t} language={language} />;
            case 'research': return <ResearchView initialQuery={initialResearchQuery} onQueryHandled={() => setInitialResearchQuery(null)} t={t} language={language} />;
            case 'calendar': return <CalendarView t={t} />;
            case 'settings': return <SettingsView t={t} deviceId={deviceId} deviceList={deviceList} onRemoveDevice={handleRemoveDevice} />;
            // Case-specific views
            case 'knowledge_base': return <KnowledgeBaseView caseData={currentCase} onNewAnalysis={handleNewAnalysis} onUpdateCase={handleUpdateCase} isUpdating={isUpdating} onGetDeepDive={handleGetDeepDive} isDeepDiveLoading={isDeepDiveLoading} onArticleSelect={handleArticleSelect} onOpenFeedback={() => setShowFeedbackModal(true)} t={t} />;
            case 'timeline': return <TimelineView caseData={currentCase} onUpdateTimeline={handleUpdateTimeline} t={t} />;
            case 'evidence': return <EvidenceView caseData={currentCase} onUpdateEvidence={handleUpdateEvidence} t={t} />;
            case 'tasks': return <TasksView tasks={currentCase?.tasks || []} onUpdateTasks={handleUpdateTasks} t={t} />;
            case 'documents': return <DocumentGeneratorView caseData={currentCase} onNewAnalysis={handleNewAnalysis} t={t} />;
            case 'notes': return <NotesView caseData={currentCase} onUpdateNotes={handleUpdateNotes} t={t} />;
            case 'billing': return <BillingView caseData={currentCase} onUpdateBilling={handleUpdateBilling} t={t} />;
            case 'debate': return <AiDebateView caseData={currentCase} onNewAnalysis={handleNewAnalysis} onRate={handleRateDebate} t={t} />;
            case 'simulation': return <SimulationView caseData={currentCase} onNewAnalysis={handleNewAnalysis} isLoading={isSimulating} onGenerateSimulation={handleSimulation} onOpenFeedback={() => setShowFeedbackModal(true)} t={t} />;
            case 'summary': return <SummaryView caseData={currentCase} onNewAnalysis={handleNewAnalysis} onOpenFeedback={() => setShowFeedbackModal(true)} onUpdateCase={updateCaseInHistory} t={t} />;
            default: return <DashboardView onStartAnalysis={handleNewAnalysis} cases={history} onNavigate={handleNavigate} onSelectCase={handleSelectCase} t={t} language={language}/>;
        }
    };

    return (
        <main className="main-container flex">
            {(isLoading || isSimulating) && <LoadingSpinner t={t} />}

            {pendingCaseData && (
                <ParticipantEditorModal
                    initialParticipants={pendingCaseData.participants.map(p => ({ name: p.name, suggestedRole: p.role }))}
                    onConfirm={handleConfirmParticipantsAndAnalyze}
                    onCancel={() => { setPendingCaseData(null); setIsLoading(false); }}
                    isLoading={isLoading}
                    t={t}
                />
            )}
            
            {showFeedbackModal && currentCase && (
                <FeedbackModal 
                    caseId={currentCase.id}
                    view={activeCaseView}
                    onClose={() => setShowFeedbackModal(false)}
                    onSubmit={(data) => { console.log("Feedback submitted:", data); }}
                    t={t}
                />
            )}

            <Navigation activeView={activeView} setActiveView={handleNavigate} onLogout={handleLogout} t={t} />
            <div className="flex-1 pl-20 overflow-y-auto">
                <div className="p-6 sm:p-8 max-w-7xl mx-auto">
                   <Header 
                       title={VIEW_DATA[currentGlobalView]?.title || t('app_name')}
                       description={VIEW_DATA[currentGlobalView]?.description || t('app_subtitle')}
                       icon={VIEW_DATA[currentGlobalView]?.icon || <DashboardIcon />}
                       theme={theme}
                       toggleTheme={toggleTheme}
                       language={language}
                       setLanguage={setLanguage}
                       deviceId={deviceId}
                       t={t}
                   />
                   {currentCase && (
                       <CaseNavigation
                           activeView={activeCaseView}
                           setActiveView={setActiveCaseView}
                           caseData={currentCase}
                           t={t}
                       />
                   )}
                   <div className="mt-8">
                       {renderActiveView()}
                   </div>
                </div>
                 <footer className="app-footer">
                    <div className="footer-content">
                        <span>© 2025 <a href="https://cdcgroup.uz" target="_blank" rel="noopener noreferrer" className="footer-link">CDCGroup</a>. {t('footer_rights')}</span>
                        <span className="footer-separator" aria-hidden="true"></span>
                        <span>{t('footer_supporter')} <a href="https://cdcgroup.uz" target="_blank" rel="noopener noreferrer" className="footer-link">CraDev company</a></span>
                    </div>
                </footer>
            </div>
        </main>
    );
};

export default App;