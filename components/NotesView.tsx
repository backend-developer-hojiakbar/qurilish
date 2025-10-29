import React, { useState } from 'react';
import type { Case, Note } from '../types';
import { PencilSquareIcon, PlusIcon, TrashIcon } from './icons';

interface NotesViewProps {
    caseData: Case | null;
    onUpdateNotes: (newNotes: Note[]) => void;
    t: (key: string) => string;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

export const NotesView: React.FC<NotesViewProps> = ({ caseData, onUpdateNotes, t }) => {
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteContent, setEditingNoteContent] = useState('');
    
    const notes = caseData?.notes || [];

    const handleAddNote = () => {
        if (newNoteContent.trim() === '') return;
        const newNote: Note = {
            id: `note-${Date.now()}`,
            content: newNoteContent,
            timestamp: new Date().toISOString(),
        };
        onUpdateNotes([newNote, ...notes]);
        setNewNoteContent('');
    };

    const handleDeleteNote = (id: string) => {
        onUpdateNotes(notes.filter(note => note.id !== id));
    };

    const startEditingNote = (note: Note) => {
        setEditingNoteId(note.id);
        setEditingNoteContent(note.content);
    };

    const saveEditedNote = (id: string) => {
        if (editingNoteContent.trim() !== '') {
            const updatedNotes = notes.map(note =>
                note.id === id ? { ...note, content: editingNoteContent } : note
            );
            onUpdateNotes(updatedNotes);
        }
        setEditingNoteId(null);
        setEditingNoteContent('');
    };

    const cancelEditing = () => {
        setEditingNoteId(null);
        setEditingNoteContent('');
    };

    return (
        <div className="space-y-6 animate-assemble-in">
            <div className="polished-pane p-4">
                <textarea
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    placeholder={t('notes_add_placeholder')}
                    className="w-full h-24 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
                />
                <div className="text-right mt-2">
                    <button onClick={handleAddNote} className="flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-black font-bold py-2 px-5 rounded-lg">
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('button_add_note')}</span>
                    </button>
                </div>
            </div>
            
            <div className="space-y-4">
                {notes.map(note => (
                    <div key={note.id} className="polished-pane p-4">
                        {editingNoteId === note.id ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editingNoteContent}
                                    onChange={e => setEditingNoteContent(e.target.value)}
                                    className="w-full h-24 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={cancelEditing}
                                        className="px-3 py-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                                    >
                                        {t('button_cancel')}
                                    </button>
                                    <button 
                                        onClick={() => saveEditedNote(note.id)}
                                        className="px-3 py-1 bg-[var(--accent-primary)] text-black font-bold rounded-lg"
                                    >
                                        {t('button_save')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-slate-300 whitespace-pre-wrap">{note.content}</p>
                                <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
                                    <span>{formatDate(note.timestamp)}</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => startEditingNote(note)}
                                            className="hover:text-white"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDeleteNote(note.id)} className="hover:text-red-400">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                {notes.length === 0 && (
                    <p className="text-center text-slate-500 py-8">{t('notes_empty')}</p>
                )}
            </div>
        </div>
    );
};