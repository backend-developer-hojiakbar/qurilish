import React, { useState, useCallback } from 'react';
import { UploadIcon, AnalysisIcon, CheckCircleIcon, ExclamationIcon } from './icons';
import type { CaseFile } from '../types';
import { getDocumentType } from '../services/geminiService';
import { addCaseFile, addCaseParticipant } from '../services/apiService';

// Add type declarations for libraries loaded from CDN
declare global {
    interface Window {
        mammoth: any;
        pdfjsLib: any;
    }
}

// Helper function for text extraction
const extractTextFromFile = async (file: File): Promise<string> => {
    // PDF
    if (file.type === 'application/pdf' && window.pdfjsLib) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                // We are casting items to any here because the pdf.js types are not globally available
                text += content.items.map((item: any) => item.str).join(' ') + '\n';
            }
            return text;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            return `[PDF faylini o'qishda xatolik: ${file.name}]`;
        }
    } 
    // DOCX
    else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && window.mammoth) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } catch (error) {
            console.error('Error extracting text from DOCX:', error);
            return `[DOCX faylini o'qishda xatolik: ${file.name}]`;
        }
    }
    // TXT
    else if (file.type.startsWith('text/')) {
        return file.text();
    }
    // For images and other types, we don't extract text
    return '';
};

interface CaseInputFormProps {
  onAnalyze: (courtType: string, caseDetails: string, files: CaseFile[], courtStage: string) => void;
  isLoading: boolean;
  t: (key: string, replacements?: { [key: string]: string }) => string;
  language: string;
}

const courtTypes = ["Fuqarolik", "Jinoyat", "Ma'muriy", "Iqtisodiy"];
const courtStages = ["Tergov", "Birinchi instansiya", "Apellyatsiya", "Kassatsiya", "Nazorat tartibida"];

// Local type for managing file processing state in the UI
type ProcessedFile = CaseFile & {
    status: 'processing' | 'ready' | 'error';
    statusText: string;
};

// A simple spinner icon for inline loading indication
const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const CaseInputForm: React.FC<CaseInputFormProps> = ({ onAnalyze, isLoading, t, language }) => {
  const [courtType, setCourtType] = useState('');
  const [courtStage, setCourtStage] = useState('');
  const [caseDetails, setCaseDetails] = useState('');
  const [files, setFiles] = useState<ProcessedFile[]>([]);

  const handleCaseDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCaseDetails(newText);
  };

  const handleFilesAdded = useCallback(async (fileList: File[]) => {
      if (!fileList || fileList.length === 0) return;

      const readFileAsDataURL = (fileToRead: File): Promise<string> => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileToRead);
      });
      
      const placeholders: ProcessedFile[] = fileList.map(file => ({
        id: `${Date.now()}-${file.name}`, name: file.name, type: file.type,
        status: 'processing',
        statusText: t('file_status_reading'),
      }));
      setFiles(prev => [...prev, ...placeholders]);

      // Process files one-by-one to provide granular UI feedback
      for (const placeholder of placeholders) {
          const file = fileList.find(f => f.name === placeholder.name);
          if (!file) continue;

          try {
              // Step 1: Read file content and extract text
              const [content, extractedText] = await Promise.all([
                  readFileAsDataURL(file),
                  extractTextFromFile(file)
              ]);

              // Update UI to show AI analysis is in progress
              setFiles(prev => prev.map(f =>
                  f.id === placeholder.id
                      ? { ...f, content, extractedText, statusText: t('file_status_analyzing') }
                      : f
              ));
              
              // Step 2: Call Gemini API to detect document type
              const fileWithData = { ...placeholder, content, extractedText };
              const detectedType = await getDocumentType(fileWithData, t, language);
              const finalStatusText = detectedType === "Boshqa" ? t('file_status_ready') : detectedType;

              // Update UI with final status for the file
              setFiles(prev => prev.map(f =>
                  f.id === placeholder.id
                      ? { ...f, documentType: detectedType, status: 'ready', statusText: finalStatusText }
                      : f
              ));

          } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              // Update UI to show an error for this specific file
              setFiles(prev => prev.map(f =>
                  f.id === placeholder.id
                      ? { ...f, status: 'error', statusText: t('file_status_error') }
                      : f
              ));
          }
      }

  }, [t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if(e.dataTransfer.files) {
        handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtType || !courtStage || (!caseDetails.trim() && files.length === 0)) return;
    // Strip local UI state fields before passing data up to the parent
    const filesToAnalyze: CaseFile[] = files.filter(f => f.status === 'ready').map(({ status, statusText, ...rest }) => rest);
    onAnalyze(courtType, caseDetails, filesToAnalyze, courtStage);
  };

  return (
    <div className="polished-pane p-8 shadow-2xl relative animate-assemble-in">
        <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset className="space-y-6" disabled={isLoading}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="court-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('case_input_court_type')}</label>
                        <select id="court-type" value={courtType} onChange={e => setCourtType(e.target.value)} required className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300">
                            <option value="" disabled>{t('select_option_placeholder')}</option>
                            {courtTypes.map(type => <option key={type} value={type}>{t(`court_type_${type.toLowerCase().replace("'", "")}`)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="court-stage" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('case_input_court_stage')}</label>
                        <select id="court-stage" value={courtStage} onChange={e => setCourtStage(e.target.value)} required className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300">
                            <option value="" disabled>{t('select_option_placeholder')}</option>
                            {courtStages.map(stage => <option key={stage} value={stage}>{t(`court_stage_${stage.replace(/ /g, '_').toLowerCase()}`)}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <div 
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-300"
                    >
                        <input type="file" id="file-upload" className="hidden" multiple onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,image/*" />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <UploadIcon className="h-12 w-12 mx-auto text-[var(--text-secondary)]" />
                            <p className="mt-3 text-base font-semibold text-slate-300">{t('case_input_dropzone_title')}</p>
                            <p className="text-sm text-[var(--text-secondary)]">{t('case_input_dropzone_subtitle')}</p>
                        </label>
                    </div>
                    {files.length > 0 && (
                       <div className="space-y-2 mt-4">
                            <h4 className="font-semibold text-slate-400">{t('case_input_uploaded_files_title')}:</h4>
                            {files.map((file) => (
                                <div key={file.id} className="flex items-center justify-between bg-[var(--bg-secondary)]/70 p-2.5 rounded-lg text-sm border border-[var(--border-color)]/50">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                            {file.status === 'processing' && <SpinnerIcon />}
                                            {file.status === 'ready' && <CheckCircleIcon className="h-5 w-5 text-green-400" />}
                                            {file.status === 'error' && <ExclamationIcon className="h-5 w-5 text-red-400" />}
                                        </div>
                                        <p className="text-slate-300 truncate">{file.name}</p>
                                    </div>
                                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                                        file.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                                        file.status === 'error' ? 'bg-red-500/20 text-red-300' :
                                        (file.documentType && file.documentType !== "Boshqa" && file.documentType !== t('file_status_ready')) ? 'bg-cyan-500/20 text-cyan-300' :
                                        'bg-green-500/20 text-green-300'
                                    }`}>
                                        {file.statusText}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="case-details" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('case_input_section1_title')}</label>
                    <textarea
                        id="case-details"
                        value={caseDetails}
                        onChange={handleCaseDetailsChange}
                        placeholder={t('case_input_details_placeholder')}
                        className="w-full h-48 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300 resize-y"
                    />
                </div>
            </fieldset>
            
            <button
              type="submit"
              disabled={isLoading || !courtType || !courtStage || (!caseDetails.trim() && files.length === 0)}
              className="w-full flex items-center justify-center gap-3 bg-[var(--accent-primary)] text-black font-bold py-4 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--glow-color-primary)] disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {isLoading ? (
                  <>
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('status_identifying_participants')}</span>
                  </>
              ) : (
                  <>
                    <AnalysisIcon className="h-6 w-6" />
                    <span className="text-lg">{t('button_analyze_strategy')}</span>
                  </>
              )}
            </button>
        </form>
    </div>
  );
};