import React, { useState, useEffect, useRef } from 'react';
import { Mic, Trash2, Send } from 'lucide-react';
import { api } from '../../services/api';

export const VoiceRecorder = ({ onSendAudio, onCancel }) => {
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    let interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start();
      } catch (err) {
        console.error('Audio recording failed:', err);
        alert('Microphone permission denied or unavailable');
        onCancel();
      }
    };

    startRecording();

    return () => {
      clearInterval(interval);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleFinishAndSend = async () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

      const formData = new FormData();
      formData.append('file', file);

      try {
        const uploadRes = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const mediaData = {
          ...uploadRes.data.data,
          duration: seconds
        };

        onSendAudio(mediaData);
      } catch (err) {
        console.error('Failed to upload voice note:', err);
        alert('Failed to send audio message');
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex items-center justify-between bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2.5 shadow-inner">
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        <span className="text-xs font-mono font-semibold text-rose-400">
          Recording {formatTime(seconds)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {[4, 14, 18, 6, 12, 20, 8, 16, 10, 14].map((h, i) => (
          <div key={i} className="w-1 bg-rose-500 rounded-full wave-bar" style={{ height: `${h}px` }} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-rose-400"
          title="Cancel"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleFinishAndSend}
          className="p-2.5 rounded-full bg-bakwas-500 text-slate-950 font-bold hover:bg-bakwas-600 shadow-md active:scale-95 transition-transform"
          title="Send Voice Note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
