import React, { useState, useRef, useCallback } from 'react';
import { MicrophoneIcon, CheckIcon, CopyIcon, DownloadIcon, TrashIcon } from './icons';
import { audioService, type AudioRecording } from '../services/audioService';

interface VoiceMemoUploaderProps {
    t: (key: string) => string;
    onAudioRecorded?: (audioFile: any) => void;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'finished';
type PlaybackState = 'idle' | 'playing' | 'paused';

export const VoiceMemoUploader: React.FC<VoiceMemoUploaderProps> = ({ t, onAudioRecorded }) => {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
    const [transcribedText, setTranscribedText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [recording, setRecording] = useState<AudioRecording | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleStartRecording = async () => {
        setRecordingState('recording');
        setError(null);
        setTranscribedText('');
        setRecording(null);
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
            setRecording(recording);
            
            // Create a simple transcription text
            const text = `${t('voice_memo_recorded_success')} ${Math.round(recording.duration)} ${t('voice_memo_seconds')}`;
            setTranscribedText(text);
            setRecordingState('finished');
            
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
    
    const handleCopy = () => {
        if (transcribedText) {
            navigator.clipboard.writeText(transcribedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    const handleDownload = () => {
        if (recording) {
            const fileName = `voice_memo_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
            audioService.downloadRecording(recording, fileName);
        }
    };
    
    const handleDelete = () => {
        // Stop playback if active
        if (audioRef.current) {
            audioRef.current.pause();
            if (audioRef.current.src) {
                URL.revokeObjectURL(audioRef.current.src);
            }
            audioRef.current = null;
        }
        
        // Reset state
        setRecording(null);
        setTranscribedText('');
        setRecordingState('idle');
        setPlaybackState('idle');
        setCurrentTime(0);
        setDuration(0);
    };
    
    const handlePlay = () => {
        if (recording) {
            if (playbackState === 'playing') {
                // Pause playback
                if (audioRef.current) {
                    audioRef.current.pause();
                }
                setPlaybackState('paused');
            } else {
                // Start or resume playback
                if (!audioRef.current) {
                    const audioUrl = URL.createObjectURL(recording.blob);
                    audioRef.current = new Audio(audioUrl);
                    
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
                        <MicrophoneIcon className="h-6 w-6" />
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
        <div className="polished-pane p-5 rounded-xl w-full h-full flex flex-col">
            <div className="flex items-start space-x-4">
                 <div className="p-3 bg-[var(--bg-secondary)]/50 rounded-lg text-[var(--accent-secondary)] border border-[var(--border-color)]">
                    <MicrophoneIcon className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg text-slate-200">{t('dashboard_action_voice_memo_title')}</h3>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">{t('dashboard_action_voice_memo_desc')}</p>
                </div>
            </div>

            <div className="flex-1 mt-4 flex flex-col">
                <button 
                    onClick={getButtonAction()} 
                    disabled={recordingState === 'processing'}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-pane)] text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-70"
                >
                    {getButtonContent()}
                </button>

                {(transcribedText || error) && (
                    <div className="mt-3 p-3 bg-black/20 rounded-lg flex-1 text-sm text-slate-300 relative">
                        {error ? <p className="text-red-400">{error}</p> : <p>{transcribedText}</p>}
                        
                        {transcribedText && !error && (
                            <div className="absolute top-2 right-2 flex gap-1">
                                <button 
                                    onClick={handlePlay} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                    title={playbackState === 'playing' ? t('voice_memo_pause') : t('voice_memo_play')}
                                >
                                    <span className="text-xs font-bold">
                                        {playbackState === 'playing' ? '❚❚' : '▶'}
                                    </span>
                                </button>
                                <button 
                                    onClick={handleDownload} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                    title={t('voice_memo_download')}
                                >
                                    <DownloadIcon className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={handleDelete} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                                    title={t('voice_memo_delete')}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={handleCopy} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                    title={t('voice_memo_copy')}
                                >
                                    {copied ? <CheckIcon className="h-4 w-4 text-[var(--accent-primary)]" /> : <CopyIcon className="h-4 w-4" />}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {recording && recordingState === 'finished' && (
                    <div className="mt-3 flex items-center gap-2">
                        <button 
                            onClick={handlePlay}
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
                )}
            </div>
        </div>
    );
};