import React, { useState, useEffect } from 'react';
import type { Case, TimelineEvent } from '../types';
import { HistoryIcon, PlusIcon, TrashIcon } from './icons';
import { getTimeline } from '../services/geminiService';

interface TimelineViewProps {
    caseData: Case | null;
    onUpdateTimeline: (newTimeline: TimelineEvent[]) => void;
    t: (key: string) => string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ caseData, onUpdateTimeline, t }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [sortedTimeline, setSortedTimeline] = useState<TimelineEvent[]>([]);
    const [newEvent, setNewEvent] = useState({ date: '', description: '' });
    const [isAddingEvent, setIsAddingEvent] = useState(false);

    useEffect(() => {
        if (caseData?.timeline) {
            const sorted = [...caseData.timeline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setSortedTimeline(sorted);
        }
    }, [caseData?.timeline]);

    const handleGenerateTimeline = async () => {
        if (!caseData) return;
        setIsLoading(true);
        try {
            const newEvents = await getTimeline(caseData.caseDetails, caseData.files, t);
            // Combine with existing events and remove duplicates
            const combined = [...caseData.timeline];
            newEvents.forEach(newEvent => {
                if (!combined.some(existing => existing.date === newEvent.date && existing.description === newEvent.description)) {
                    combined.push(newEvent);
                }
            });
            onUpdateTimeline(combined);
        } catch (error) {
            console.error("Failed to generate timeline:", error);
            alert(t('error_generic_title'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEvent = () => {
        if (!newEvent.date || !newEvent.description.trim()) return;
        
        const event: TimelineEvent = {
            date: newEvent.date,
            description: newEvent.description.trim(),
            type: 'event'
        };
        
        const updatedTimeline = [...(caseData?.timeline || []), event];
        onUpdateTimeline(updatedTimeline);
        setNewEvent({ date: '', description: '' });
        setIsAddingEvent(false);
    };

    const handleDeleteEvent = (index: number) => {
        const updatedTimeline = [...(caseData?.timeline || [])];
        updatedTimeline.splice(index, 1);
        onUpdateTimeline(updatedTimeline);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="animate-assemble-in">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <button
                    onClick={handleGenerateTimeline}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-[var(--accent-primary)] text-black font-bold py-2 px-5 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50"
                >
                    <HistoryIcon className="h-5 w-5" />
                    <span>{isLoading ? t('timeline_generating') : t('timeline_generate_button')}</span>
                </button>
                
                <button
                    onClick={() => setIsAddingEvent(!isAddingEvent)}
                    className="flex items-center gap-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-pane)] text-white font-bold py-2 px-5 rounded-lg transition-colors"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>{t('timeline_add_event')}</span>
                </button>
            </div>

            {/* Add Event Form */}
            {isAddingEvent && (
                <div className="polished-pane p-4 mb-6">
                    <h3 className="font-semibold text-lg mb-3">{t('timeline_add_event_title')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('timeline_event_date')}</label>
                            <input
                                type="date"
                                value={newEvent.date}
                                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('timeline_event_description')}</label>
                            <input
                                type="text"
                                value={newEvent.description}
                                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                                placeholder={t('timeline_event_description_placeholder')}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            onClick={() => setIsAddingEvent(false)}
                            className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                        >
                            {t('button_cancel')}
                        </button>
                        <button
                            onClick={handleAddEvent}
                            disabled={!newEvent.date || !newEvent.description.trim()}
                            className="px-4 py-2 bg-[var(--accent-primary)] text-black font-bold rounded-lg disabled:opacity-50"
                        >
                            {t('button_add')}
                        </button>
                    </div>
                </div>
            )}

            <div className="polished-pane p-4">
                {sortedTimeline.length > 0 ? (
                    <div className="relative pl-6">
                        {/* Vertical line */}
                        <div className="absolute left-8 top-0 h-full w-0.5 bg-[var(--border-color)]"></div>

                        {sortedTimeline.map((event, index) => (
                            <div key={index} className="relative mb-6 group">
                                {/* Dot on the line */}
                                <div className="absolute left-8 top-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--accent-primary)] ring-4 ring-[var(--bg-secondary)]"></div>
                                <div className="ml-8 flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-[var(--accent-primary)]">{formatDate(event.date)}</p>
                                        <p className="mt-1 text-slate-300">{event.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteEvent(index)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-red-400"
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
                        <HistoryIcon className="h-12 w-12 mx-auto text-[var(--text-secondary)] mb-3" />
                        <p className="text-slate-500">{t('timeline_empty')}</p>
                        <button
                            onClick={() => setIsAddingEvent(true)}
                            className="mt-3 text-[var(--accent-primary)] hover:underline"
                        >
                            {t('timeline_add_first_event')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};