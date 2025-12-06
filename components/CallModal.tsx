
import React, { useEffect, useState } from 'react';
import { PhoneOffIcon, SendIcon } from './Icons';
import { liveClient } from '../services/liveService';
import { Voice } from '../types';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  voice: Voice;
}

const CallModal: React.FC<CallModalProps> = ({ isOpen, onClose, voice }) => {
  const [status, setStatus] = useState<string>('connecting');
  const [duration, setDuration] = useState(0);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Start Call
      setStatus('connecting');
      setDuration(0);
      setInputText('');
      
      liveClient.connect(voice, (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'error' || newStatus === 'disconnected') {
          setTimeout(onClose, 2000);
        }
      }).catch(() => {
        setStatus('error');
        setTimeout(onClose, 2000);
      });

      // Timer
      const timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(timer);
        liveClient.disconnect();
      };
    }
  }, [isOpen, voice, onClose]);

  const handleHangup = () => {
    liveClient.disconnect();
    onClose();
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    liveClient.sendText(inputText);
    setInputText('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  // Status Text Mapping (Sorani)
  const getStatusText = () => {
    switch (status) {
      case 'connecting': return 'پەیوەندی دەبەستێت...';
      case 'connected': return 'پەیوەندی بەسترا';
      case 'listening': return 'گوێ دەگرێت...';
      case 'speaking': return 'قسە دەکات...';
      case 'error': return 'کێشەیەک ڕوویدا';
      case 'disconnected': return 'پەیوەندی بچڕا';
      default: return 'چاوەڕوانی...';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gray-900/95 backdrop-blur-md text-white transition-opacity duration-300 animate-fade-in py-10">
      
      {/* Header Info */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <h2 className="text-2xl font-bold tracking-wide">ANAS</h2>
        <span className="text-sm bg-gray-800 px-3 py-1 rounded-full text-gray-300 border border-gray-700">
           {getStatusText()}
        </span>
        <div className="text-4xl font-mono font-light tracking-widest mt-2">
          {formatTime(duration)}
        </div>
      </div>

      {/* Visualizer (Animated Circle) */}
      <div className="relative flex items-center justify-center flex-1">
        <div className="relative flex items-center justify-center h-64 w-64">
          {/* Outer Rings - Pulse based on status */}
          <div className={`absolute inset-0 rounded-full border-2 border-blue-500 opacity-20 ${status === 'speaking' || status === 'listening' ? 'animate-ping' : ''}`}></div>
          <div className={`absolute inset-4 rounded-full border border-blue-400 opacity-20 ${status === 'speaking' ? 'animate-pulse' : ''}`} style={{ animationDuration: '1.5s' }}></div>
          
          {/* Core Circle */}
          <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.5)] transition-all duration-500 ${
             status === 'speaking' ? 'bg-gradient-to-br from-blue-500 to-cyan-400 scale-110' : 
             status === 'listening' ? 'bg-gradient-to-br from-purple-500 to-pink-500 scale-100' :
             'bg-gray-700'
          }`}>
             <span className="text-4xl font-bold">A</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-6 mb-4">
        
        {/* Text Input for Call */}
        <div className="w-full flex items-center gap-2" dir="rtl">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="لێرە بنووسە..." 
            className="flex-1 bg-gray-800/80 border border-gray-700 rounded-full px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-gray-800 transition-colors shadow-inner"
          />
          <button 
            onClick={handleSendText}
            className={`p-3 rounded-full text-white transition-all shadow-lg ${inputText.trim() ? 'bg-blue-600 hover:bg-blue-700 scale-100' : 'bg-gray-700 text-gray-500 scale-95'}`}
            disabled={!inputText.trim()}
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Hangup Button */}
        <button 
          onClick={handleHangup}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <PhoneOffIcon className="w-8 h-8" />
        </button>
        
        <p className="text-xs text-gray-500">پەیوەندی دەنگی و نووسین - کوردی</p>
      </div>
    </div>
  );
};

export default CallModal;
