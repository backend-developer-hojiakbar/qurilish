import React, { useState, useRef } from 'react';
import { MicrophoneIcon, DownloadIcon, TrashIcon } from './icons';
import { audioService, type AudioRecording } from '../services/audioService';
import { uploadCaseFile } from '../services/apiService';

interface VoiceMemoManagerProps {
    t: (key: string) => string;
    caseId?: string;
    onAudioRecorded?: (audioFile: any) => void;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'finished';
type PlaybackState = 'idle' | 'playing' | 'paused';

export const VoiceMemoManager: React.FC<VoiceMemoManagerProps> = ({ t, caseId, onAudioRecorded }) => {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
    const [recordings, setRecordings] = useState<AudioRecording[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [selectedRecording, setSelectedRecording] = useState<AudioRecording | null>(null);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentRecordingRef = useRef<AudioRecording | null>(null);

    const handleStartRecording = async () => {
        setRecordingState('recording');
        setError(null);
        try {
            await audioService.startRecording();
        } catch (err: any) {
            setError(err.message || t('error_generic_title'));
            setRecordingState('idle');
        }
    };
    
    const handleStopRecording = async () => {
        setRecordingState('processing');
        try {
            const recording = await audioService.stopRecording();
            currentRecordingRef.current = recording;
            setRecordings(prev => [...prev, recording]);
            setRecordingState('finished');
            setSelectedRecording(recording);
            
            // Convert to CaseFile and notify parent if callback provided
            if (onAudioRecorded) {
                const audioFile = audioService.saveRecordingAsFile(recording);
                onAudioRecorded(audioFile);
            }
        } catch (err: any) {
            setError(err.message || t('error_generic_title'));
            setRecordingState('idle');
        }
    };
    
    const handlePlay = (recording?: AudioRecording) => {
        const targetRecording = recording || selectedRecording;
        if (!targetRecording) return;
        
        if (selectedRecording !== targetRecording) {
            setSelectedRecording(targetRecording);
        }
        
        if (playbackState === 'playing') {
            // Pause playback
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setPlaybackState('paused');
        } else {
            // Start or resume playback
            if (!audioRef.current || currentRecordingRef.current !== targetRecording) {
                // Clean up previous audio if exists
                if (audioRef.current) {
                    audioRef.current.pause();
                    URL.revokeObjectURL(audioRef.current.src);
                }
                
                const audioUrl = URL.createObjectURL(targetRecording.blob);
                audioRef.current = new Audio(audioUrl);
                currentRecordingRef.current = targetRecording;
                
                audioRef.current.onplay = () => {
                    setPlaybackState('playing');
                };
                
                audioRef.current.onpause = () => {
                    setPlaybackState('paused');
                };
                
                audioRef.current.onended = () => {
                    setPlaybackState('idle');
                    setCurrentTime(0);
                };
                
                audioRef.current.ontimeupdate = () => {
                    if (audioRef.current) {
                        setCurrentTime(audioRef.current.currentTime);
                    }
                };
                
                audioRef.current.onloadedmetadata = () => {
                    if (audioRef.current) {
                        setDuration(audioRef.current.duration);
                    }
                };
            }
            
            audioRef.current.play().catch(error => {
                console.error('Error playing audio:', error);
                setError(t('error_generic_title'));
            });
        }
    };
    
    const handleDownload = (recording: AudioRecording) => {
        const fileName = `voice_memo_${recording.timestamp.toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        audioService.downloadRecording(recording, fileName);
    };
    
    const handleDelete = (recording: AudioRecording) => {
        // If this is the currently playing recording, stop it
        if (selectedRecording === recording) {
            if (audioRef.current) {
                audioRef.current.pause();
                if (audioRef.current.src) {
                    URL.revokeObjectURL(audioRef.current.src);
                }
                audioRef.current = null;
            }
            setPlaybackState('idle');
            setSelectedRecording(null);
        }
        
        // Remove from recordings list
        setRecordings(prev => prev.filter(r => r !== recording));
        
        // Clean up the blob URL
        URL.revokeObjectURL(URL.createObjectURL(recording.blob));
    };
    
    const handleSaveToCase = async (recording: AudioRecording) => {
        if (!caseId) {
            setError(t('voice_memo_case_required'));
            return;
        }
        
        try {
            const file = audioService.convertRecordingToFile(recording);
            const fileData = {
                name: recording.timestamp.toISOString().slice(0, 19).replace(/:/g, '-') + '.webm',
                type: 'audio/webm',
                extractedText: `Audio memo recorded on ${recording.timestamp.toLocaleString()}. Duration: ${recording.duration.toFixed(1)} seconds.`,
                documentType: 'Voice Memo'
            };
            
            // Upload to backend
            await uploadCaseFile(caseId, file, fileData);
            
            // Show success message
            alert(t('voice_memo_saved_success'));
        } catch (err: any) {
            console.error('Error saving voice memo to case:', err);
            setError(err.message || t('error_generic_title'));
        }
    };

    const getButtonContent = () => {
        switch(recordingState) {
            case 'recording':
                return (
                    <>
                        <div className="animate-pulse h-3 w-3 bg-red-500 rounded-full"></div>
                        <span>{t('voice_memo_recording')}</span>
                        <div className="ml-2 flex items-center justify-center">
                            <div className="h-4 w-4 bg-red-500 rounded"></div>
                        </div>
                    </>
                );
            case 'processing':
                return <span>{t('voice_memo_processing')}</span>;
            case 'finished':
                return <span>{t('voice_memo_record_again')}</span>;
            case 'idle':
            default:
                return (
                    <>
                        <MicrophoneIcon className="h-5 w-5" />
                        <span>{t('voice_memo_start')}</span>
                    </>
                );
        }
    }

    const getButtonAction = () => {
        if (recordingState === 'recording') {
            return handleStopRecording;
        }
        return handleStartRecording;
    }
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="polished-pane p-5 rounded-xl w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-200">{t('voice_memo_manager_title')}</h3>
                <MicrophoneIcon className="h-6 w-6 text-[var(--accent-secondary)]" />
            </div>
            
            {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button 
                    onClick={getButtonAction()} 
                    disabled={recordingState === 'processing'}
                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-pane)] text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-70"
                >
                    {getButtonContent()}
                </button>
            </div>
            
            {recordings.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-medium text-slate-300 mb-2">{t('voice_memo_recordings')}</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recordings.map((recording, index) => (
                            <div 
                                key={index} 
                                className={`p-3 rounded-lg border transition-colors ${
                                    selectedRecording === recording 
                                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]' 
                                        : 'bg-[var(--bg-secondary)]/50 border-[var(--border-color)] hover:bg-[var(--bg-pane)]'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {t('voice_memo_title')} {index + 1}
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {formatTime(recording.duration)} • {recording.timestamp.toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button 
                                            onClick={() => handlePlay(recording)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                            title={playbackState === 'playing' && selectedRecording === recording ? t('voice_memo_pause') : t('voice_memo_play')}
                                        >
                                            <span className="text-xs font-bold">
                                                {playbackState === 'playing' && selectedRecording === recording ? '❚❚' : '▶'}
                                            </span>
                                        </button>
                                        <button 
                                            onClick={() => handleDownload(recording)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                            title={t('voice_memo_download')}
                                        >
                                            <DownloadIcon className="h-4 w-4" />
                                        </button>
                                        {caseId && (
                                            <button 
                                                onClick={() => handleSaveToCase(recording)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                                title={t('voice_memo_save_to_case')}
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(recording)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                                            title={t('voice_memo_delete')}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {selectedRecording && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handlePlay()}
                            className="flex items-center justify-center p-2 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-pane)] text-white"
                        >
                            <span className="text-sm font-bold">
                                {playbackState === 'playing' ? '❚❚' : '▶'}
                            </span>
                        </button>
                        <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[var(--accent-primary)] rounded-full"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <span className="text-xs text-slate-400 min-w-[70px] text-right">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};