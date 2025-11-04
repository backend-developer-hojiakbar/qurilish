import type { CaseFile } from '../types';

/**
 * Audio Service for recording, saving, and managing voice memos
 * This service provides a more reliable alternative to the Gemini real-time transcription
 * which was causing WebSocket errors.
 */

interface AudioRecording {
  blob: Blob;
  timestamp: Date;
  duration: number;
}

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number | null = null;
  private recordings: AudioRecording[] = [];

  /**
   * Start recording audio
   * @returns Promise that resolves when recording starts
   */
  async startRecording(): Promise<void> {
    try {
      // Clear previous recording data
      this.audioChunks = [];
      this.startTime = null;

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(stream);
      
      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Start recording
      this.startTime = Date.now();
      this.mediaRecorder.start();
      
    } catch (error: any) {
      console.error('Error starting audio recording:', error);
      
      // Network error handling
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('error_network_connection');
      }
      
      throw new Error('Failed to access microphone. Please check your browser permissions.');
    }
  }

  /**
   * Stop recording audio
   * @returns Promise that resolves with the recorded audio blob
   */
  async stopRecording(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      // Set up stop event handler
      this.mediaRecorder.onstop = () => {
        try {
          // Calculate recording duration
          const duration = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
          
          // Create blob from recorded chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          // Create recording object
          const recording: AudioRecording = {
            blob: audioBlob,
            timestamp: new Date(),
            duration: duration
          };
          
          // Store recording
          this.recordings.push(recording);
          
          // Clean up
          this.cleanup();
          
          resolve(recording);
        } catch (error) {
          reject(new Error('Failed to process recording'));
        }
      };

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Stop recording
      this.mediaRecorder.stop();
    });
  }

  /**
   * Save recording as a CaseFile
   * @param recording Audio recording to save
   * @param fileName Optional file name
   * @returns CaseFile object representing the audio memo
   */
  saveRecordingAsFile(recording: AudioRecording, fileName?: string): CaseFile {
    // Generate file name if not provided
    const name = fileName || `voice_memo_${recording.timestamp.getTime()}.webm`;
    
    // Convert blob to data URL
    const dataUrl = URL.createObjectURL(recording.blob);
    
    // Create CaseFile object
    const caseFile: CaseFile = {
      id: `audio-${Date.now()}`,
      name: name,
      type: recording.blob.type || 'audio/webm',
      content: dataUrl,
      extractedText: `Audio memo recorded on ${recording.timestamp.toLocaleString()}. Duration: ${recording.duration.toFixed(1)} seconds.`,
      documentType: 'Voice Memo'
    };
    
    return caseFile;
  }

  /**
   * Convert recording to a File object for upload
   * @param recording Audio recording to convert
   * @param fileName Optional file name
   * @returns File object
   */
  convertRecordingToFile(recording: AudioRecording, fileName?: string): File {
    // Generate file name if not provided
    const name = fileName || `voice_memo_${recording.timestamp.getTime()}.webm`;
    
    // Convert blob to File
    const file = new File([recording.blob], name, { type: recording.blob.type || 'audio/webm' });
    
    return file;
  }

  /**
   * Get all recordings
   * @returns Array of all recordings
   */
  getRecordings(): AudioRecording[] {
    return [...this.recordings];
  }

  /**
   * Clear all recordings
   */
  clearRecordings(): void {
    this.recordings = [];
  }

  /**
   * Play an audio recording
   * @param recording Audio recording to play
   */
  playRecording(recording: AudioRecording): void {
    try {
      const audioUrl = URL.createObjectURL(recording.blob);
      const audio = new Audio(audioUrl);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    } catch (error) {
      console.error('Error creating audio player:', error);
    }
  }

  /**
   * Download an audio recording
   * @param recording Audio recording to download
   * @param fileName File name for download
   */
  downloadRecording(recording: AudioRecording, fileName: string): void {
    try {
      const audioUrl = URL.createObjectURL(recording.blob);
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  }

  /**
   * Check if currently recording
   * @returns Boolean indicating if recording is in progress
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping track:', error);
        }
      });
      this.mediaRecorder = null;
    }
    this.audioChunks = [];
    this.startTime = null;
  }
}

// Create and export singleton instance
export const audioService = new AudioService();

// Export types
export type { AudioRecording };