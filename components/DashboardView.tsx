import React, { useState } from 'react';
import type { Case, View } from '../types';
import { AnalysisIcon, HistoryIcon, ResearchIcon, FolderIcon, MicrophoneIcon } from './icons';
import { VoiceMemoUploader } from './VoiceMemoUploader';
import { uploadCaseFile } from '../services/apiService';

const getLocaleForLanguage = (language: string) => {
    switch (language) {
        case 'uz-cyrl': return 'uz-Cyrl-UZ';
        case 'ru': return 'ru-RU';
        case 'en': return 'en-US';
        default: return 'en-US';
    }
}

const formatDate = (dateString: string, language: string) => {
    const date = new Date(dateString);
    const locale = getLocaleForLanguage(language);
    return date.toLocaleString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}


interface DashboardViewProps {
    onStartAnalysis: () => void;
    cases: Case[];
    onNavigate: (view: View) => void;
    onSelectCase: (caseItem: Case) => void;
    t: (key: string, replacements?: { [key: string]: string }) => string;
    language: string;
}

const QuickActionButton: React.FC<{
    icon: React.ReactElement<{ className?: string }>;
    title: string;
    description: string;
    onClick?: () => void;
}> = ({ icon, title, description, onClick }) => (
    <button onClick={onClick} className="polished-pane interactive-hover p-5 rounded-xl text-left w-full h-full flex items-start space-x-4">
        <div className="p-3 bg-[var(--bg-secondary)]/50 rounded-lg text-[var(--accent-primary)] border border-[var(--border-color)]">
            {React.cloneElement(icon, { className: "h-8 w-8" })}
        </div>
        <div>
            <h3 className="font-semibold text-lg text-slate-200">{title}</h3>
            <p className="text-[var(--text-secondary)] text-sm mt-1">{description}</p>
        </div>
    </button>
);

const CaseCard: React.FC<{ caseItem: Case, onSelect: () => void, t: (key: string) => string, language: string }> = ({ caseItem, onSelect, t, language }) => {
    const translatedTags = caseItem.tags.map(tag => {
        // Try to translate as a court type first
        const typeKey = `court_type_${tag.toLowerCase().replace("'", "")}`;
        const typeTranslation = t(typeKey);
        if (typeTranslation !== typeKey) return typeTranslation;

        // If not a type, try to translate as a court stage
        const stageKey = `court_stage_${tag.replace(/ /g, '_').toLowerCase()}`;
        const stageTranslation = t(stageKey);
        if (stageTranslation !== stageKey) return stageTranslation;
        
        // Fallback to the original tag if no translation is found
        return tag;
    }).join(' / ');
    
    return (
        <button onClick={onSelect} className="polished-pane interactive-hover p-5 rounded-xl text-left w-full h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3">
                    <FolderIcon className="h-6 w-6 text-[var(--accent-primary)]" />
                    <h3 className="font-bold text-xl text-slate-100 truncate">{caseItem.title}</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{translatedTags}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-right">
                <p className="text-xs text-slate-500">{t('case_card_last_updated')}: {formatDate(caseItem.timestamp, language)}</p>
            </div>
        </button>
    );
};


export const DashboardView: React.FC<DashboardViewProps> = ({ onStartAnalysis, cases, onNavigate, onSelectCase, t, language }) => {
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [showCaseSelector, setShowCaseSelector] = useState(false);

    // Handle audio recording from voice memo
    const handleAudioRecorded = async (audioFile: any) => {
        // If we have cases, show case selector to save the audio file
        if (cases.length > 0) {
            setShowCaseSelector(true);
            setSelectedCase(audioFile);
        }
    };

    // Handle saving audio file to a specific case
    const handleSaveAudioToCase = async (caseItem: Case) => {
        if (selectedCase) {
            try {
                // Convert the audio file to a proper File object
                const response = await fetch(selectedCase.content);
                const blob = await response.blob();
                const file = new File([blob], selectedCase.name, { type: selectedCase.type });
                
                // Upload to backend
                await uploadCaseFile(caseItem.id, file, {
                    name: selectedCase.name,
                    type: selectedCase.type,
                    extractedText: selectedCase.extractedText,
                    documentType: selectedCase.documentType
                });
                
                console.log('Audio memo saved to case:', caseItem.id);
                alert(t('voice_memo_saved_success'));
            } catch (error) {
                console.error('Error saving voice memo to case:', error);
                alert(t('error_generic_title'));
            }
        }
        setShowCaseSelector(false);
        setSelectedCase(null);
    };

    return (
        <div className="space-y-10 animate-assemble-in">
            {/* Quick Actions */}
            <section>
                <h2 className="text-2xl font-bold mb-5 tracking-tight">{t('dashboard_quick_actions')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <QuickActionButton 
                        icon={<AnalysisIcon />}
                        title={t('dashboard_action_new_analysis_title')}
                        description={t('dashboard_action_new_analysis_desc')}
                        onClick={onStartAnalysis}
                    />
                     <QuickActionButton 
                        icon={<ResearchIcon />}
                        title={t('dashboard_action_express_analysis_title')}
                        description={t('dashboard_action_express_analysis_desc')}
                        onClick={() => onNavigate('research')}
                    />
                    <VoiceMemoUploader t={t} onAudioRecorded={handleAudioRecorded} />
                </div>
            </section>

            {/* Case selector modal */}
            {showCaseSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="polished-pane p-6 rounded-xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">{t('voice_memo_select_case')}</h3>
                        <p className="text-[var(--text-secondary)] mb-4">{t('voice_memo_select_case_desc')}</p>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {cases.map(caseItem => (
                                <button
                                    key={caseItem.id}
                                    onClick={() => handleSaveAudioToCase(caseItem)}
                                    className="w-full text-left p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-pane)] transition-colors"
                                >
                                    <div className="font-medium">{caseItem.title}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">
                                        {caseItem.tags.join(' / ')}
                                    </div>
                                </button>
                            ))}
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCaseSelector(false)}
                                className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                            >
                                {t('button_cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* My Cases */}
            <section>
                 <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold tracking-tight">{t('dashboard_my_cases')}</h2>
                    {cases.length > 0 && (
                        <button onClick={() => onNavigate('history')} className="font-semibold text-sm text-[var(--accent-primary)] hover:underline">
                            {t('dashboard_view_all')}
                        </button>
                    )}
                 </div>
                 {cases.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {cases.slice(0, 6).map(c => (
                            <CaseCard key={c.id} caseItem={c} onSelect={() => onSelectCase(c)} t={t} language={language}/>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-10 polished-pane rounded-xl">
                        <p className="text-[var(--text-secondary)] text-lg">{t('dashboard_no_cases')}</p>
                        <button onClick={onStartAnalysis} className="mt-6 bg-[var(--accent-primary)] text-black font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 hover:shadow-lg hover:shadow-[var(--glow-color-primary)]">
                             {t('button_start_new_analysis')}
                        </button>
                    </div>
                 )}
            </section>
        </div>
    );
};