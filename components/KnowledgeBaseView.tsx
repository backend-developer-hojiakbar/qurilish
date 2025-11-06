import React, { useState, useRef, useEffect } from 'react';
import type { Case, CaseFile } from '../types';
import { EmptyState } from './EmptyState';
import { WinProbabilityGauge } from './SummaryView';
import { DatabaseIcon, CheckCircleIcon, ShieldExclamationIcon, LightBulbIcon, DocumentTextIcon, ChartBarIcon, ResearchIcon, DownloadIcon, UsersIcon, ExclamationIcon, ChatBubbleLeftRightIcon } from './icons';
import { CaseUpdateForm } from './CaseUpdateForm';

// Add type declarations for libraries loaded from CDN
declare global {
    interface Window {
        jspdf: any;
        XLSX: any;
    }
}

interface KnowledgeBaseViewProps {
  caseData: Case | undefined | null;
  onNewAnalysis: () => void;
  onUpdateCase: (caseId: string, additionalDetails: string, newFiles: CaseFile[]) => void;
  isUpdating: boolean;
  onGetDeepDive: () => void;
  isDeepDiveLoading: boolean;
  onArticleSelect: (article: string) => void;
  onOpenFeedback: () => void;
  t: (key: string, replacements?: { [key: string]: string }) => string;
  language: string;
}

// Add new interface for investigation-specific data
interface InvestigationData {
  suspects: { name: string; role: string; evidence: string }[];
  investigationActions: string[];
  proceduralIssues: string[];
}

const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-slate-100 mt-8 mb-4">{line.substring(3)}</h2>);
      continue;
    }
    
    if (line.trim().startsWith('* ')) {
      const listItems = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('* ')) {
        const itemLine = lines[j];
        const itemContent = itemLine.substring(itemLine.indexOf('* ') + 2);
        const parts = itemContent.split('**');
        const renderedParts = parts.map((part, index) => 
          index % 2 !== 0 ? <strong key={index} className="font-bold text-slate-100">{part}</strong> : <span key={index}>{part}</span>
        );
        listItems.push(<li key={j}>{renderedParts}</li>);
        j++;
      }
      elements.push(<ul key={`ul-start-${i}`} className="list-disc list-inside space-y-2 pl-4 my-3">{listItems}</ul>);
      i = j - 1;
      continue;
    }

    const parts = line.split('**');
    const renderedParts = parts.map((part, index) => 
        index % 2 !== 0 ? <strong key={index} className="font-bold text-slate-100">{part}</strong> : <span key={index}>{part}</span>
    );

    elements.push(<p key={i} className="mb-2 text-slate-400">{renderedParts}</p>);
  }
  return elements;
};

const SectionCard: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode;
}> = ({ title, icon, children }) => (
    <div className="polished-pane p-4">
        <div className="flex items-center justify-between gap-3 mb-3">=
            <div className="flex items-center gap-3">
                <div className="text-[var(--accent-secondary)]">{icon}</div>
                <h3 className="font-semibold text-lg text-slate-200">{title}</h3>
            </div>
        </div>
        <div className="text-slate-300 text-sm">
            {children}
        </div>
    </div>
);

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ caseData, onNewAnalysis, onUpdateCase, isUpdating, onGetDeepDive, isDeepDiveLoading, onArticleSelect, onOpenFeedback, t, language }) => {
  const [exportingType, setExportingType] = useState<'word' | 'pdf' | null>(null);
  const result = caseData?.result;
  const isInvestigationStage = caseData?.courtStage === t('court_stage_tergov_raw');
  
  if (!caseData || !result || !result.knowledgeBase) {
    return (
        <EmptyState
            icon={<DatabaseIcon />}
            title={t('empty_state_kb_title')}
            message={t('empty_state_kb_message')}
            t={t}
        >
            <button
                onClick={onNewAnalysis}
                className="mt-6 bg-[var(--accent-primary)] text-black font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--glow-color)]"
            >
                {t('button_start_new_analysis')}
            </button>
        </EmptyState>
    )
  }

  const { knowledgeBase, deepDiveAnalysis, winProbability, probabilityJustification, positiveFactors, negativeFactors } = result;
  const sol = knowledgeBase.statuteOfLimitations;

  // For investigation stage, extract specialized data
  const investigationData: InvestigationData | null = isInvestigationStage ? {
    suspects: caseData?.participants
      .filter(p => p.role === t('client_role_sudlanuvchi') || p.role === 'Судланувчи' || p.role === 'Подсудимый' || p.role === 'Accused')
      .map(p => ({ 
        name: p.name, 
        role: p.role, 
        evidence: knowledgeBase.keyFacts
          .filter(fact => fact.relevance.toLowerCase().includes('dalil') || fact.relevance.toLowerCase().includes('evidence') || fact.relevance.toLowerCase().includes('доказательство'))
          .map(fact => fact.fact)
          .join(', ') || t('kb_no_evidence_specified')
      })) || [],
    investigationActions: [
      t('investigation_action_collect_evidence'),
      t('investigation_action_interview_witnesses'),
      t('investigation_action_analyze_documents'),
      t('investigation_action_check_procedural_compliance')
    ],
    proceduralIssues: knowledgeBase.weaknesses
      .filter(weakness => weakness.toLowerCase().includes('protsess') || weakness.toLowerCase().includes('process') || weakness.toLowerCase().includes('процесс'))
      .map(weakness => weakness) || []
  } : null;

  const handleUpdate = (additionalDetails: string, newFiles: CaseFile[]) => {
      if (caseData) {
        onUpdateCase(caseData.id, additionalDetails, newFiles);
      }
  }

  const handleExportWord = () => {
    if (!caseData || !result) return;
    setExportingType('word');

    try {
        const listToHtml = (items: string[], title: string) => `<h4>${title}</h4><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        const markdownToHtml = (text: string) => text
            .replace(/##\s*(.*)/g, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*\s(.*)/g, '<li>$1</li>')
            .replace(/(\r\n|\n|\r)/gm, '<br>');

        let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${caseData.title}</title></head>
            <body>
                <h1>${t('pdf_kb_full_report_title')}</h1>
                <h2>${t('pdf_report_for_case', { caseTitle: caseData.title })}</h2>
                <hr/>
                <h3>${t('win_probability_details')}</h3>
                <p><strong>${t('pdf_win_probability')}: ${winProbability}%</strong> - <i>${probabilityJustification}</i></p>
                ${listToHtml(positiveFactors, t('win_probability_positive_factors'))}
                ${listToHtml(negativeFactors, t('win_probability_negative_factors'))}
                <hr/>
                <h3>${t('kb_participants_title')}</h3>
                <ul>${caseData.participants.map(p => `<li><strong>${p.name}</strong> - ${p.role}${p.name === caseData.clientName ? ` (${t('kb_client_tag')})` : ''}</li>`).join('')}</ul>
                <hr/>
                <h3>${t('kb_key_facts')}</h3>
                <ul>${knowledgeBase.keyFacts.map(item => `<li><strong>${item.fact}:</strong> ${item.relevance}</li>`).join('')}</ul>
                <hr/>
                <h3>${t('kb_legal_issues')}</h3>
                ${listToHtml(knowledgeBase.legalIssues, '')}
                <hr/>
                 <h3>${t('kb_applicable_laws')}</h3>
                <ul>${knowledgeBase.applicableLaws.map(item => `<li><strong>${item.article}:</strong> ${item.summary}</li>`).join('')}</ul>
                <hr/>
                <h3>${t('kb_strengths')}</h3>
                ${listToHtml(knowledgeBase.strengths, '')}
                <h3>${t('kb_weaknesses')}</h3>
                ${listToHtml(knowledgeBase.weaknesses, '')}
                ${deepDiveAnalysis ? `<hr/><h3>${t('kb_deep_dive_title')}</h3>${markdownToHtml(deepDiveAnalysis)}` : ''}
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeCaseTitle = caseData.title.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_');
        link.download = `${safeCaseTitle}_hisobot.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch(e) {
        console.error("Failed to generate Word file", e);
    } finally {
        setExportingType(null);
    }
  };

  const handleExportPdf = () => {
    if (!caseData || !result) return;
    setExportingType('pdf');

    try {
        // Get jsPDF from window object
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: caseData.title,
            subject: t('pdf_kb_full_report_title'),
            author: 'Adolat AI'
        });
        
        // Set font and styling
        doc.setFont('helvetica');
        doc.setFontSize(22);
        doc.setTextColor(209, 255, 15); // --accent-primary
        
        // Add title
        doc.text(t('pdf_kb_full_report_title'), 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(t('pdf_report_for_case', { caseTitle: caseData.title }), 105, 30, { align: 'center' });
        
        // Add date
        doc.setFontSize(12);
        doc.setTextColor(136, 153, 179); // --text-secondary
        doc.text(`${t('pdf_date_prefix')}${new Date().toLocaleDateString()}`, 105, 37, { align: 'center' });
        
        // Add separator line
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, 42, 190, 42);
        
        let yPos = 50;
        
        // Win Probability Section
        doc.setFontSize(16);
        doc.setTextColor(209, 255, 15); // --accent-primary
        doc.text(t('win_probability_details'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`${t('pdf_win_probability')}: ${result.winProbability}% - ${result.probabilityJustification}`, 20, yPos, { maxWidth: 170 });
        yPos += 10;
        
        // Positive Factors
        if (result.positiveFactors.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(76, 175, 80); // Green color
            doc.text(t('win_probability_positive_factors'), 20, yPos);
            yPos += 7;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            result.positiveFactors.forEach((factor, index) => {
                if (yPos > 280) { // Check if we need a new page
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`• ${factor}`, 25, yPos, { maxWidth: 165 });
                yPos += 7;
            });
            yPos += 5;
        }
        
        // Negative Factors
        if (result.negativeFactors.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(244, 67, 54); // Red color
            doc.text(t('win_probability_negative_factors'), 20, yPos);
            yPos += 7;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            result.negativeFactors.forEach((factor, index) => {
                if (yPos > 280) { // Check if we need a new page
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`• ${factor}`, 25, yPos, { maxWidth: 165 });
                yPos += 7;
            });
            yPos += 5;
        }
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Participants Section
        doc.setFontSize(16);
        doc.setTextColor(209, 255, 15); // --accent-primary
        doc.text(t('kb_participants_title'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        caseData.participants.forEach((participant, index) => {
            if (yPos > 280) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            const clientTag = participant.name === caseData.clientName ? ` (${t('kb_client_tag')})` : '';
            doc.text(`${participant.name} - ${participant.role}${clientTag}`, 25, yPos, { maxWidth: 165 });
            yPos += 7;
        });
        yPos += 5;
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Key Facts Section
        doc.setFontSize(16);
        doc.setTextColor(209, 255, 15); // --accent-primary
        doc.text(isInvestigationStage ? t('kb_key_evidence') : t('kb_key_facts'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        knowledgeBase.keyFacts.forEach((fact, index) => {
            if (yPos > 280) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            doc.text(`${fact.fact}: ${fact.relevance}`, 25, yPos, { maxWidth: 165 });
            yPos += 7;
        });
        yPos += 5;
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Legal Issues Section
        doc.setFontSize(16);
        doc.setTextColor(209, 255, 15); // --accent-primary
        doc.text(t('kb_legal_issues'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        knowledgeBase.legalIssues.forEach((issue, index) => {
            if (yPos > 280) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            doc.text(`• ${issue}`, 25, yPos, { maxWidth: 165 });
            yPos += 7;
        });
        yPos += 5;
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Applicable Laws Section
        doc.setFontSize(16);
        doc.setTextColor(209, 255, 15); // --accent-primary
        doc.text(isInvestigationStage ? t('kb_potential_charges') : t('kb_applicable_laws'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        knowledgeBase.applicableLaws.forEach((law, index) => {
            if (yPos > 280) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            doc.text(`${law.article}: ${law.summary}`, 25, yPos, { maxWidth: 165 });
            yPos += 7;
        });
        yPos += 5;
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Strengths Section
        doc.setFontSize(16);
        doc.setTextColor(76, 175, 80); // Green color
        doc.text(t('kb_strengths'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        knowledgeBase.strengths.forEach((strength, index) => {
            if (yPos > 280) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            doc.text(`• ${strength}`, 25, yPos, { maxWidth: 165 });
            yPos += 7;
        });
        yPos += 5;
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Weaknesses Section
        doc.setFontSize(16);
        doc.setTextColor(244, 67, 54); // Red color
        doc.text(t('kb_weaknesses'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        knowledgeBase.weaknesses.forEach((weakness, index) => {
            if (yPos > 280) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            doc.text(`• ${weakness}`, 25, yPos, { maxWidth: 165 });
            yPos += 7;
        });
        yPos += 5;
        
        // Deep Dive Analysis Section (if available)
        if (result.deepDiveAnalysis) {
            // Add separator line
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.setDrawColor(136, 153, 179); // --text-secondary
            doc.line(20, yPos, 190, yPos);
            yPos += 10;
            
            doc.setFontSize(16);
            doc.setTextColor(209, 255, 15); // --accent-primary
            doc.text(t('kb_deep_dive_title'), 20, yPos);
            yPos += 10;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            // Simple text wrapping for deep dive analysis
            const lines = doc.splitTextToSize(result.deepDiveAnalysis, 170);
            lines.forEach((line: string, index: number) => {
                if (yPos > 280) { // Check if we need a new page
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, 20, yPos);
                yPos += 7;
            });
        }
        
        // Save the PDF
        const safeCaseTitle = caseData.title.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_');
        doc.save(`${safeCaseTitle}_hisobot.pdf`);
    } catch(e) {
        console.error("Failed to generate PDF file", e);
    } finally {
        setExportingType(null);
    }
  };

  return (
    <section className="animate-assemble-in space-y-6">
        <div className="flex justify-end mb-2 gap-2">
            <button onClick={onOpenFeedback} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <span>{t('button_feedback')}</span>
            </button>
            <button onClick={handleExportPdf} disabled={!!exportingType} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover disabled:opacity-50">
                <DownloadIcon className="h-5 w-5" />
                <span>{exportingType === 'pdf' ? t('button_generating') : t('button_export_pdf_kb')}</span>
                {exportingType === 'pdf' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            </button>
            <button onClick={handleExportWord} disabled={!!exportingType} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover disabled:opacity-50">
                <DownloadIcon className="h-5 w-5" />
                <span>{exportingType === 'word' ? t('button_generating') : t('button_export_word_kb')}</span>
                {exportingType === 'word' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            </button>
        </div>
        
        <WinProbabilityGauge 
            probability={winProbability}
            justification={probabilityJustification}
            positiveFactors={positiveFactors}
            negativeFactors={negativeFactors}
            t={t}
        />

        <CaseUpdateForm 
            onUpdate={handleUpdate} 
            isLoading={isUpdating} 
            t={t}
            language={language}
        />

        {/* Specialized view for investigation stage */}
        {isInvestigationStage && investigationData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Suspects Section */}
            <SectionCard 
              title={t('investigation_suspects_title')}
              icon={<UsersIcon />}
            >
              {investigationData.suspects.length > 0 ? (
                <ul className="space-y-3">
                  {investigationData.suspects.map((suspect, index) => (
                    <li key={index} className="border-b border-[var(--border-color)] pb-3 last:border-0 last:pb-0">
                      <div className="font-semibold text-slate-200">{suspect.name}</div>
                      <div className="text-sm text-[var(--text-secondary)]">{suspect.role}</div>
                      <div className="text-sm text-slate-400 mt-1">
                        <span className="font-medium">{t('investigation_evidence_label')}:</span> {suspect.evidence || t('kb_no_evidence_specified')}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm">{t('investigation_no_suspects')}</p>
              )}
            </SectionCard>

            {/* Investigation Actions */}
            <SectionCard 
              title={t('investigation_actions_title')}
              icon={<ChartBarIcon />}
            >
              <ul className="space-y-2">
                {investigationData.investigationActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-[var(--accent-primary)] mt-1">•</span>
                    <span className="text-slate-300">{action}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* Procedural Issues */}
            {investigationData.proceduralIssues.length > 0 && (
              <SectionCard 
                title={t('investigation_procedural_issues_title')}
                icon={<ShieldExclamationIcon className="text-red-400" />}
              >
                <ul className="space-y-2">
                  {investigationData.proceduralIssues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ExclamationIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{issue}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        )}

        {/* Standard view for non-investigation stages */}
        {!isInvestigationStage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ... existing standard sections ... */}
          </div>
        )}

        {/* Common sections for both stages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Evidence/Facts Section */}
          <SectionCard 
              title={isInvestigationStage ? t('kb_key_evidence') : t('kb_key_facts')}
              icon={<DocumentTextIcon/>}
          >
              <ul className="list-disc list-inside space-y-2 pl-9">
                  {knowledgeBase.keyFacts.map((item, index) => <li key={index}><strong>{item.fact}:</strong> {item.relevance}</li>)}
              </ul>
          </SectionCard>
          
          {/* Participants Section */}
          <SectionCard 
              title={t('kb_participants_title')} 
              icon={<UsersIcon />}
          >
               <ul className="list-disc list-inside space-y-2 pl-9">
                  {caseData.participants.map((p, index) => (
                      <li key={index}>
                          <strong>{p.name}</strong> - <span className="text-[var(--text-secondary)]">{p.role}</span>
                          {p.name === caseData.clientName && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">{t('kb_client_tag')}</span>}
                      </li>
                  ))}
              </ul>
          </SectionCard>
          
          {/* Statute of Limitations */}
          {sol && (
              <SectionCard
                  title={t('kb_sol_title')}
                  icon={
                      sol.status === 'OK' ? <CheckCircleIcon className="text-green-400" /> :
                      sol.status === 'Xavf ostida' ? <ExclamationIcon className="text-yellow-400" /> :
                      <ShieldExclamationIcon className="text-red-400" />
                  }
              >
                  <div className="pl-9">
                      <p className={`font-bold ${
                          sol.status === 'OK' ? 'text-green-400' :
                          sol.status === 'Xavf ostida' ? 'text-yellow-400' :
                          'text-red-400'
                      }`}>{t(`sol_status_${sol.status.replace(/ /g, '_').replace("'", "")}`)}</p>
                      <p className="text-slate-400 mt-1 text-xs">{sol.summary}</p>
                  </div>
              </SectionCard>
          )}
          
          {/* Laws/Charges Section */}
           <SectionCard 
              title={isInvestigationStage ? t('kb_potential_charges') : t('kb_applicable_laws')}
              icon={<ChartBarIcon/>}
          >
              <ul className="space-y-1 -mx-2">
                  {knowledgeBase.applicableLaws.map((item, index) => (
                      <li key={index} className="rounded-md hover:bg-[var(--bg-secondary)] transition-all group transform hover:scale-[1.02]">
                         <div className="p-2 flex items-start gap-3">
                              <ResearchIcon className="h-4 w-4 text-[var(--accent-primary)] mt-1 flex-shrink-0" />
                              <div>
                                  <div className="flex items-center flex-wrap gap-2">
                                      <button
                                          onClick={() => onArticleSelect(item.article)}
                                          className="text-left font-semibold text-[var(--accent-primary)] group-hover:underline"
                                          title={t('case_input_research_article_tooltip', { article: item.article })}
                                      >
                                          {item.article}
                                      </button>
                                      {item.url && (
                                          <a 
                                              href={item.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-xs font-mono px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900"
                                          >
                                              URL
                                          </a>
                                      )}
                                  </div>
                                  <p className="text-slate-400 text-xs mt-1">{item.summary}</p>
                              </div>
                          </div>
                      </li>
                  ))}
              </ul>
          </SectionCard>
          
          {/* Strengths/Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <SectionCard 
                  title={t('kb_strengths')} 
                  icon={<CheckCircleIcon className="text-green-400"/>}
              >
                  <ul className="list-disc list-inside space-y-1 pl-9">
                      {knowledgeBase.strengths.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
              </SectionCard>
               <SectionCard 
                  title={t('kb_weaknesses')} 
                  icon={<ShieldExclamationIcon className="text-red-400"/>}
              >
                  <ul className="list-disc list-inside space-y-1 pl-9">
                      {knowledgeBase.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
              </SectionCard>
          </div>
          
          {/* Legal Issues */}
           <SectionCard 
              title={t('kb_legal_issues')} 
              icon={<LightBulbIcon/>}
          >
               <ul className="list-disc list-inside space-y-1 pl-9">
                  {knowledgeBase.legalIssues.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
          </SectionCard>
        </div>

        {/* Deep Dive Section */}
        <div className="polished-pane p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <LightBulbIcon className="h-10 w-10 text-[var(--accent-primary)] flex-shrink-0"/>
                    <div>
                        <h3 className="font-semibold text-xl text-slate-100">{t('kb_deep_dive_title')}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{t('kb_deep_dive_prompt')}</p>
                    </div>
                </div>
                <button
                    onClick={onGetDeepDive}
                    disabled={isDeepDiveLoading}
                    className="w-full sm:w-auto flex-shrink-0 bg-[var(--accent-primary)] text-black font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50"
                >
                    {isDeepDiveLoading ? (
                        <div className="flex items-center gap-2">
                           <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           <span>{t('deep_dive_loading')}</span>
                        </div>
                    ) : (
                       <span>{t('button_deep_dive')}</span>
                    )}
                </button>
            </div>
            {deepDiveAnalysis && (
                <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                    {renderMarkdown(deepDiveAnalysis)}
                </div>
            )}
        </div>
    </section>
  );
};