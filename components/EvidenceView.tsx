import React, { useState, useRef } from 'react';
import type { Case, EvidenceItem, CaseFile } from '../types';
import { BeakerIcon, UploadIcon, TrashIcon, DocumentTextIcon } from './icons';

interface EvidenceViewProps {
    caseData: Case | null;
    onUpdateEvidence: (newEvidence: EvidenceItem[]) => void;
    t: (key: string) => string;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({ caseData, onUpdateEvidence, t }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // This component displays files from the case as evidence
    const evidence = caseData?.evidence || [];
    const files = caseData?.files || [];

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;
        
        setIsUploading(true);
        // In a real implementation, you would upload the files to the server
        // For now, we'll just create mock evidence items
        setTimeout(() => {
            const newEvidence: EvidenceItem[] = Array.from(selectedFiles).map((file: File, index) => ({
                id: `evidence-${Date.now()}-${index}`,
                fileId: `file-${Date.now()}-${index}`,
                name: file.name,
                type: file.type,
                timestamp: new Date().toISOString()
            }));
            
            onUpdateEvidence([...(caseData?.evidence || []), ...newEvidence]);
            setIsUploading(false);
            
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }, 1000);
    };

    const handleDeleteEvidence = (id: string) => {
        const updatedEvidence = evidence.filter(item => item.id !== id);
        onUpdateEvidence(updatedEvidence);
    };

    const getFileIcon = (type: string) => {
        if (type.includes('image')) return <DocumentTextIcon className="h-5 w-5 text-blue-400" />;
        if (type.includes('video')) return <DocumentTextIcon className="h-5 w-5 text-purple-400" />;
        return <DocumentTextIcon className="h-5 w-5 text-green-400" />;
    };

    return (
        <div className="space-y-6 animate-assemble-in">
            <div className="polished-pane p-4">
                <div 
                    className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp4,.mov"
                    />
                    <UploadIcon className="h-10 w-10 mx-auto text-[var(--text-secondary)]" />
                    <p className="mt-2 text-sm text-slate-300">{t('evidence_upload_prompt')}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {isUploading ? t('evidence_uploading') : t('evidence_supported_formats')}
                    </p>
                </div>
            </div>
            
            <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    {t('evidence_uploaded_title')} 
                    <span className="text-sm font-normal text-[var(--text-secondary)]">({evidence.length})</span>
                </h3>
                
                {evidence.length > 0 ? (
                    <div className="space-y-3">
                        {evidence.map(item => (
                            <div key={item.id} className="polished-pane p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    {getFileIcon(item.type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-200 truncate">{item.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(item.timestamp).toLocaleDateString()} • {item.type}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleDeleteEvidence(item.id)}
                                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10"
                                        title={t('button_delete')}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <BeakerIcon className="h-12 w-12 mx-auto text-[var(--text-secondary)] mb-3" />
                        <p className="text-slate-500">{t('evidence_none')}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 text-[var(--accent-primary)] hover:underline"
                        >
                            {t('evidence_upload_first')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};