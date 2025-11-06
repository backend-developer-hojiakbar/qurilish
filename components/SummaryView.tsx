import React, { useState, useRef, useEffect } from 'react';
import { EmptyState } from './EmptyState';
import { AnalysisIcon, CopyIcon, CheckIcon, DocumentTextIcon, UsersIcon, DownloadIcon, ShieldCheckIcon, ExclamationIcon, XMarkIcon, CheckCircleIcon, ShieldExclamationIcon, ChevronDownIcon, ChartBarIcon, ChatBubbleLeftRightIcon, BrainIcon } from './icons';
import type { Case, RiskMatrixEntry } from '../types';
import { ClientSummaryModal } from './ClientSummaryModal';
import { generateClientSummary, translateDebateResult } from '../services/geminiService';

// Add type declarations for libraries loaded from CDN
declare global {
    interface Window {
        jspdf: any;
        XLSX: any;
    }
}

interface SummaryViewProps {
  caseData: Case | undefined | null;
  onNewAnalysis: () => void;
  onOpenFeedback: () => void;
  onUpdateCase: (updatedCase: Case) => void;
  t: (key: string, replacements?: { [key: string]: string }) => string;
  language: string;
}

const RiskMatrix: React.FC<{ matrix: RiskMatrixEntry[], t: (key: string) => string }> = ({ matrix, t }) => {
    const getLikelihoodClass = (likelihood: 'Past' | 'O\'rta' | 'Yuqori') => {
        switch (likelihood) {
            case 'Past': return 'bg-green-500/20 text-green-300';
            case 'O\'rta': return 'bg-yellow-500/20 text-yellow-300';
            case 'Yuqori': return 'bg-red-500/20 text-red-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    return (
        <div className="polished-pane rounded-xl my-8">
            <h2 className="text-xl font-bold text-slate-200 p-4 border-b border-[var(--border-color)]">{t('risk_matrix_title')}</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-[var(--text-secondary)] font-semibold">
                            <th className="p-3">{t('risk_matrix_header_risk')}</th>
                            <th className="p-3">{t('risk_matrix_header_likelihood')}</th>
                            <th className="p-3">{t('risk_matrix_header_mitigation')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.map((item, index) => (
                            <tr key={index} className="border-t border-[var(--border-color)]">
                                <td className="p-3 text-slate-300 align-top">{item.risk}</td>
                                <td className="p-3 align-top">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLikelihoodClass(item.likelihood)}`}>
                                        {t(`likelihood_${item.likelihood.toLowerCase()}`)}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-400 align-top">{item.mitigation}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// A simple Markdown parser for the summary
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Headings
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-slate-100 mt-8 mb-4">{line.substring(3)}</h2>);
      continue;
    }
    
    // List items
    if (line.trim().startsWith('* ')) {
      const listItems = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('* ')) {
        const itemLine = lines[j];
        listItems.push(<li key={j}>{itemLine.substring(itemLine.indexOf('* ') + 2)}</li>);
        j++;
      }
      elements.push(<ul key={`ul-start-${i}`} className="list-disc list-inside space-y-2 pl-4 my-3">{listItems}</ul>);
      i = j - 1;
      continue;
    }

    // Bold text
    const parts = line.split('**');
    const renderedParts = parts.map((part, index) => 
        index % 2 !== 0 ? <strong key={index} className="font-bold text-slate-100">{part}</strong> : <span key={index}>{part}</span>
    );

    elements.push(<p key={i} className="mb-2 text-slate-400">{renderedParts}</p>);
  }
  return elements;
};

export const WinProbabilityGauge: React.FC<{ probability: number, justification: string, positiveFactors: string[], negativeFactors: string[], t: (key: string, replacements?: { [key: string]: string }) => string }> = ({ probability, justification, positiveFactors, negativeFactors, t }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (probability / 100) * circumference;

    const getColor = (p: number) => {
        if (p < 40) return '#ef4444'; // red-500
        if (p < 70) return '#eab308'; // yellow-500
        return 'var(--accent-primary)';
    }
    const color = getColor(probability);

    return (
        <div className="polished-pane rounded-xl mb-8 overflow-hidden">
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-slate-200 text-center">{t('win_probability_details')}</h2>
                <div className="flex flex-col items-center">
                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full" viewBox="0 0 140 140">
                            <circle cx="70" cy="70" r="50" fill="none" stroke="rgba(0, 245, 255, 0.1)" strokeWidth="1" />
                            <circle cx="70" cy="70" r="50" fill="none" stroke="var(--accent-secondary)" strokeWidth="1" strokeDasharray="10 20" className="animate-spin" style={{ animationDuration: '10s' }}/>
                            <circle strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke={color} fill="transparent" r={radius} cx="70" cy="70" />
                            <circle
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                stroke={color}
                                fill="transparent"
                                r={radius}
                                cx="70"
                                cy="70"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.8s ease-out' }}
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold" style={{ color }}>
                            {probability}<span className="text-2xl opacity-70">%</span>
                        </span>
                    </div>
                    <p className="mt-4 max-w-lg text-sm text-slate-400 italic text-center">
                        {justification}
                    </p>
                </div>
                
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100 mt-6 pt-6 border-t border-[var(--border-color)]' : 'max-h-0 opacity-0'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                        <div>
                            <h3 className="flex items-center gap-2 font-semibold text-green-400 mb-2">
                                <CheckCircleIcon className="h-5 w-5" />
                                <span>{t('win_probability_positive_factors')}</span>
                            </h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                {positiveFactors.map((factor, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-green-400 mt-0.5">&bull;</span>
                                        <span>{factor}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                         <div>
                            <h3 className="flex items-center gap-2 font-semibold text-red-400 mb-2">
                                <ShieldExclamationIcon className="h-5 w-5" />
                                <span>{t('win_probability_negative_factors')}</span>
                            </h3>
                             <ul className="space-y-2 text-sm text-slate-300">
                                {negativeFactors.map((factor, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                       <span className="text-red-400 mt-0.5">&bull;</span>
                                        <span>{factor}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="border-t border-[var(--border-color)] text-center py-3">
                 <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="font-semibold text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-2 mx-auto"
                >
                    <span>{isExpanded ? t('button_hide_details') : t('button_show_details')}</span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};


export const SummaryView: React.FC<SummaryViewProps> = ({ caseData, onNewAnalysis, onOpenFeedback, onUpdateCase, t, language }) => {
  const [copied, setCopied] = useState(false);
  const [exportingType, setExportingType] = useState<'word' | 'pdf' | null>(null);
  const [showClientSummary, setShowClientSummary] = useState(false);
  const [isGeneratingClientSummary, setIsGeneratingClientSummary] = useState(false);
  
  const result = caseData?.result;
  const exportRef = useRef<HTMLElement | null>(null);
  const summary = result?.summary;
  const isInvestigationStage = caseData?.courtStage === t('court_stage_tergov_raw');
  const viewTitle = isInvestigationStage ? t('view_investigation_summary_title') : t('view_summary_title');

  const handleCopy = () => {
    if (summary) {
        navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleExportWord = async () => {
    if (!caseData || !result) return;
    setExportingType('word');

    try {
        const baseResult = result;
        const exportResult = (caseData.language && caseData.language !== language)
          ? await translateDebateResult(baseResult, language)
          : baseResult;

        const { winProbability, probabilityJustification, positiveFactors, negativeFactors, summary: resultSummary, debate } = exportResult;
        
        const listToHtml = (items: string[]) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        const markdownToHtml = (text: string) => text
            .replace(/##\s*(.*)/g, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*\s(.*)/g, '<li>$1</li>')
            .replace(/(\r\n|\n|\r)/gm, '<br>');

        let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${caseData.title}</title></head>
            <body>
                <h1>${t('pdf_report_title')}</h1>
                <h2>${t('case_prefix')}${caseData.title}</h2>
                <p><i>${t('pdf_date_prefix')}${new Date().toLocaleDateString()}</i></p>
                <hr/>
                <h3>${t('win_probability_details')}</h3>
                <p><strong>${t('pdf_win_probability')}: ${winProbability}%</strong></p>
                <p><i>${probabilityJustification}</i></p>
                <h4>${t('win_probability_positive_factors')}</h4>
                ${listToHtml(positiveFactors)}
                <h4>${t('win_probability_negative_factors')}</h4>
                ${listToHtml(negativeFactors)}
                <hr/>
                <h3>${t('pdf_battle_plan')}</h3>
                ${markdownToHtml(resultSummary)}
                <hr/>
                <h3>${t('pdf_debate_title')}</h3>
                ${debate.map(d => {
                    const personaKey = d.lawyerName.toLowerCase().replace(/ /g, '_').replace('-', '_');
                    const personaName = isInvestigationStage ? t(`persona_investigator_${personaKey}_name`) : t(`persona_${personaKey}_name`);
                    return `<h4>${personaName}</h4><p>${markdownToHtml(d.analysis)}</p>`;
                }).join('')}
            </body>
            </html>
        `;

        const htmlWithBom = '\ufeff' + html;
        const blob = new Blob([htmlWithBom], { type: 'application/msword;charset=utf-8' });
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

  const handleExportPdf = async () => {
    if (!caseData || !result) return;
    setExportingType('pdf');

    try {
        const baseResult = result;
        const exportResult = (caseData.language && caseData.language !== language)
          ? await translateDebateResult(baseResult, language)
          : baseResult;

        // If html2canvas is available, capture the visible report for Unicode-safe PDF
        const h2c: any = (window as any).html2canvas;
        if (h2c && exportRef.current) {
            const node = exportRef.current as HTMLElement;
            // Temporarily inject a print-ready container with localized texts and exportResult
            // We'll clone current section to ensure what user sees is what they get
            const clone = node.cloneNode(true) as HTMLElement;
            clone.style.background = '#ffffff';
            clone.style.color = '#000000';
            clone.style.padding = '20px';
            document.body.appendChild(clone);
            const canvas = await h2c(clone, { scale: 2, useCORS: true });
            document.body.removeChild(clone);
            const imgData = canvas.toDataURL('image/png');
            const jsPDF = window.jspdf.jsPDF;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let y = 0;
            let remaining = imgHeight;
            // Add multiple pages if needed
            while (remaining > 0) {
                pdf.addImage(imgData, 'PNG', 0, y ? 0 : 0, imgWidth, imgHeight);
                remaining -= pageHeight;
                if (remaining > 0) {
                    pdf.addPage();
                }
                y += pageHeight;
            }
            const safeCaseTitle = caseData.title.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_');
            pdf.save(`${safeCaseTitle}_hisobot.pdf`);
            return;
        }

        // Fallback to jsPDF text method
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: caseData.title,
            subject: t('pdf_report_title'),
            author: 'Adolat AI'
        });
        
        // Set font and styling
        doc.setFont('helvetica');
        doc.setFontSize(22);
        doc.setTextColor(209, 255, 15); // --accent-primary
        
        // Add title
        doc.text(t('pdf_report_title'), 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(`${t('case_prefix')}${caseData.title}`, 105, 30, { align: 'center' });
        
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
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`${t('pdf_win_probability')}: ${exportResult.winProbability}%`, 20, yPos);
        yPos += 8;
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(exportResult.probabilityJustification, 20, yPos, { maxWidth: 170 });
        yPos += 15;
        
        // Positive Factors
        if (exportResult.positiveFactors.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(76, 175, 80); // Green color
            doc.text(t('win_probability_positive_factors'), 20, yPos);
            yPos += 8;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            exportResult.positiveFactors.forEach((factor, index) => {
                if (yPos > 280) { // Check if we need a new page
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`• ${factor}`, 25, yPos, { maxWidth: 165 });
                yPos += 7;
            });
            yPos += 10;
        }
        
        // Negative Factors
        if (exportResult.negativeFactors.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(244, 67, 54); // Red color
            doc.text(t('win_probability_negative_factors'), 20, yPos);
            yPos += 8;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            exportResult.negativeFactors.forEach((factor, index) => {
                if (yPos > 280) { // Check if we need a new page
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`• ${factor}`, 25, yPos, { maxWidth: 165 });
                yPos += 7;
            });
            yPos += 10;
        }
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Battle Plan Section
        doc.setFontSize(16);
        doc.setTextColor(209, 255, 15); // --accent-primary
        doc.text(t('pdf_battle_plan'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        // Process the summary markdown-like text
        const lines = exportResult.summary.split('\n');
        lines.forEach((line, index) => {
            if (yPos > 280) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            
            if (line.startsWith('## ')) {
                // Heading
                doc.setFontSize(14);
                doc.setTextColor(209, 255, 15); // --accent-primary
                doc.text(line.substring(3), 20, yPos, { maxWidth: 170 });
                yPos += 10;
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
            } else if (line.trim().startsWith('* ')) {
                // List item
                doc.text(line.substring(2), 25, yPos, { maxWidth: 165 });
                yPos += 7;
            } else if (line.includes('**')) {
                // Bold text - simplified handling
                const parts = line.split('**');
                let xPos = 20;
                parts.forEach((part, partIndex) => {
                    if (partIndex % 2 !== 0) {
                        // Bold part
                        doc.setFont(undefined, 'bold');
                        doc.text(part, xPos, yPos);
                        xPos += doc.getTextWidth(part);
                        doc.setFont(undefined, 'normal');
                    } else {
                        // Normal part
                        doc.text(part, xPos, yPos);
                        xPos += doc.getTextWidth(part);
                    }
                });
                yPos += 7;
            } else if (line.trim() !== '') {
                // Regular paragraph
                const wrappedLines = doc.splitTextToSize(line, 170);
                wrappedLines.forEach((wrappedLine: string) => {
                    if (yPos > 280) { // Check if we need a new page
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(wrappedLine, 20, yPos);
                    yPos += 7;
                });
            } else {
                // Empty line
                yPos += 3;
            }
        });
        
        // Add separator line
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(136, 153, 179); // --text-secondary
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Debate Section
        doc.setFontSize(16);
        doc.setTextColor(209, 255, 15); // --accent-primary
        doc.text(t('pdf_debate_title'), 20, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        exportResult.debate.forEach((debateItem, index) => {
            if (yPos > 270) { // Check if we need a new page
                doc.addPage();
                yPos = 20;
            }
            
            // Lawyer name
            const personaKey = debateItem.lawyerName.toLowerCase().replace(/ /g, '_').replace('-', '_');
            const personaName = isInvestigationStage ? t(`persona_investigator_${personaKey}_name`) : t(`persona_${personaKey}_name`);
            
            doc.setFont(undefined, 'bold');
            doc.text(personaName, 20, yPos);
            yPos += 8;
            doc.setFont(undefined, 'normal');
            
            // Analysis text
            const analysisLines = debateItem.analysis.split('\n');
            analysisLines.forEach((line, lineIndex) => {
                if (yPos > 280) { // Check if we need a new page
                    doc.addPage();
                    yPos = 20;
                }
                
                if (line.startsWith('## ')) {
                    // Heading
                    doc.setFontSize(13);
                    doc.setTextColor(0, 0, 0);
                    doc.text(line.substring(3), 25, yPos, { maxWidth: 165 });
                    yPos += 9;
                    doc.setFontSize(12);
                } else if (line.trim().startsWith('* ')) {
                    // List item
                    doc.text(line.substring(2), 30, yPos, { maxWidth: 160 });
                    yPos += 7;
                } else if (line.includes('**')) {
                    // Bold text - simplified handling
                    const parts = line.split('**');
                    let xPos = 25;
                    parts.forEach((part, partIndex) => {
                        if (partIndex % 2 !== 0) {
                            // Bold part
                            doc.setFont(undefined, 'bold');
                            doc.text(part, xPos, yPos);
                            xPos += doc.getTextWidth(part);
                            doc.setFont(undefined, 'normal');
                        } else {
                            // Normal part
                            doc.text(part, xPos, yPos);
                            xPos += doc.getTextWidth(part);
                        }
                    });
                    yPos += 7;
                } else if (line.trim() !== '') {
                    // Regular paragraph
                    const wrappedLines = doc.splitTextToSize(line, 165);
                    wrappedLines.forEach((wrappedLine: string) => {
                        if (yPos > 280) { // Check if we need a new page
                            doc.addPage();
                            yPos = 20;
                        }
                        doc.text(wrappedLine, 25, yPos);
                        yPos += 7;
                    });
                } else {
                    // Empty line
                    yPos += 3;
                }
            });
            
            yPos += 5;
        });
        
        // Save the PDF
        const safeCaseTitle = caseData.title.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_');
        doc.save(`${safeCaseTitle}_hisobot.pdf`);
    } catch(e) {
        console.error("Failed to generate PDF file", e);
    } finally {
        setExportingType(null);
    }
  };

  const handleGenerateClientSummary = async () => {
    if (!caseData || !summary) return;
    setIsGeneratingClientSummary(true);
    try {
        const clientSummaryText = await generateClientSummary(summary, t, language);
        const updatedCase = {
            ...caseData,
            result: { ...caseData.result, clientSummary: clientSummaryText },
        };
        onUpdateCase(updatedCase);
        setShowClientSummary(true);
    } catch (error) {
        console.error("Failed to generate client summary", error);
        alert(t('error_generic_title'));
    } finally {
        setIsGeneratingClientSummary(false);
    }
  };


  if (!caseData || !result || !summary) {
    return (
        <EmptyState 
            icon={<AnalysisIcon />}
            title={t('empty_state_summary_title')}
            message={t('empty_state_summary_message')}
            t={t}
        >
            <button
                onClick={onNewAnalysis}
                className="mt-6 bg-[var(--accent-primary)] text-black font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 hover:shadow-lg hover:shadow-[var(--glow-color)]"
            >
                {t('button_start_new_analysis')}
            </button>
        </EmptyState>
    )
  }

  return (
    <section ref={exportRef as any}>
       {showClientSummary && result.clientSummary && (
            <ClientSummaryModal 
                summaryText={result.clientSummary}
                onClose={() => setShowClientSummary(false)}
                t={t}
            />
        )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold animated-gradient-text">{viewTitle}</h2>
        <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleGenerateClientSummary} disabled={isGeneratingClientSummary} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover disabled:opacity-50">
                <BrainIcon className="h-5 w-5" />
                <span>{isGeneratingClientSummary ? t('button_generating') : t('button_generate_client_summary')}</span>
            </button>
            <button onClick={onOpenFeedback} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <span>{t('button_feedback')}</span>
            </button>
            <button onClick={handleCopy} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover">
                {copied ? <CheckIcon className="h-5 w-5 text-[var(--accent-primary)]" /> : <CopyIcon className="h-5 w-5" />}
                <span>{copied ? t('button_copied') : t('button_copy')}</span>
            </button>
            <button onClick={handleExportPdf} disabled={!!exportingType} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover disabled:opacity-50">
                <DownloadIcon className="h-5 w-5" />
                <span>{exportingType === 'pdf' ? t('button_generating') : t('button_export_pdf_summary')}</span>
                {exportingType === 'pdf' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            </button>
            <button onClick={handleExportWord} disabled={!!exportingType} className="flex items-center gap-2 polished-pane p-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white interactive-hover disabled:opacity-50">
                <DownloadIcon className="h-5 w-5" />
                <span>{exportingType === 'word' ? t('button_generating') : t('button_export_word_summary')}</span>
                {exportingType === 'word' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            </button>
        </div>
      </div>
      <WinProbabilityGauge 
        probability={result.winProbability}
        justification={result.probabilityJustification}
        positiveFactors={result.positiveFactors}
        negativeFactors={result.negativeFactors}
        t={t}
      />
      {result.riskMatrix && <RiskMatrix matrix={result.riskMatrix} t={t} />}
      <div className="polished-pane p-6">
        {renderMarkdown(summary)}
      </div>
    </section>
  );
};