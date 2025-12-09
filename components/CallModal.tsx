
import React, { useEffect, useState } from 'react';
import { PhoneOffIcon, SendIcon, MicIcon, MicOffIcon } from './Icons';
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
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Start Call
      setStatus('connecting');
      setDuration(0);
      setInputText('');
      setIsMuted(false);
      
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

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    liveClient.setMute(newState);
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl text-white transition-all duration-500 animate-fade-in py-8">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] transition-all duration-1000 ${status === 'speaking' ? 'scale-125 opacity-40' : 'scale-100 opacity-20'}`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] transition-all duration-1000 ${status === 'listening' ? 'scale-125 opacity-40' : 'scale-100 opacity-20'}`}></div>
      </div>

      {/* Header Info */}
      <div className="relative z-10 flex flex-col items-center gap-3 mt-4 w-full px-6">
        <div className="flex items-center justify-between w-full max-w-sm">
           <span className="text-sm font-mono text-gray-400">{formatTime(duration)}</span>
           <h2 className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">ANAS</h2>
           <div className={`h-2 w-2 rounded-full ${status === 'connected' || status === 'listening' || status === 'speaking' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500'}`}></div>
        </div>
        
        <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
           <span className="text-sm text-gray-200">{getStatusText()}</span>
        </div>
      </div>

      {/* Dynamic Visualizer */}
      <div className="relative z-10 flex items-center justify-center flex-1 w-full">
         {/* Audio Wave Simulation */}
         <div className="flex items-center gap-1.5 h-32">
            {[...Array(8)].map((_, i) => (
              <div 
                key={`l-${i}`} 
                className={`w-2 bg-gradient-to-t from-blue-500 to-cyan-300 rounded-full transition-all duration-300 ease-in-out ${
                  status === 'speaking' ? 'animate-wave' : 'h-2 bg-gray-700'
                }`}
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  height: status === 'speaking' ? `${Math.random() * 60 + 20}%` : '8px'
                }}
              ></div>
            ))}
            
            {/* Center Core */}
            <div className={`relative mx-4 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
               status === 'speaking' ? 'shadow-[0_0_40px_rgba(59,130,246,0.6)] scale-110' : 
               status === 'listening' ? 'shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-100' : 
               'shadow-none scale-95'
            }`}>
               <div className={`absolute inset-0 rounded-full border border-white/10 ${status === 'speaking' ? 'animate-spin-slow' : ''}`}></div>
               <div className={`w-full h-full rounded-full bg-gradient-to-br flex items-center justify-center ${
                 status === 'speaking' ? 'from-blue-500 to-cyan-500' :
                 status === 'listening' ? 'from-purple-500 to-pink-500' :
                 'from-gray-700 to-gray-600'
               }`}>
                  <MicIcon className={`w-8 h-8 text-white ${isMuted ? 'opacity-50' : 'opacity-100'}`} />
               </div>
               
               {/* Mute Indicator Overlay */}
               {isMuted && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full backdrop-blur-sm">
                    <MicOffIcon className="w-8 h-8 text-red-500" />
                 </div>
               )}
            </div>

            {[...Array(8)].map((_, i) => (
              <div 
                key={`r-${i}`} 
                className={`w-2 bg-gradient-to-t from-blue-500 to-cyan-300 rounded-full transition-all duration-300 ease-in-out ${
                  status === 'speaking' ? 'animate-wave' : 'h-2 bg-gray-700'
                }`}
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  height: status === 'speaking' ? `${Math.random() * 60 + 20}%` : '8px'
                }}
              ></div>
            ))}
         </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center gap-6 mb-8">
        
        {/* Text Input Overlay */}
        <div className="w-full flex items-center gap-2" dir="rtl">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="لێرە بنووسە..." 
            className="flex-1 bg-white/10 border border-white/10 rounded-full px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white/20 transition-all backdrop-blur-md"
          />
          <button 
            onClick={handleSendText}
            className={`p-3 rounded-full text-white transition-all shadow-lg ${inputText.trim() ? 'bg-blue-600 hover:bg-blue-500 scale-100' : 'bg-gray-700/50 text-gray-500 scale-95'}`}
            disabled={!inputText.trim()}
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-8">
          <button 
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted 
                ? 'bg-white text-gray-900 shadow-lg scale-110' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
          </button>

          <button 
            onClick={handleHangup}
            className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-transform hover:scale-105 active:scale-95 ring-4 ring-red-500/20"
          >
            <PhoneOffIcon className="w-8 h-8 text-white" />
          </button>
          
          <div className="w-14 h-14"></div> {/* Spacer for symmetry */}
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50% { transform: scaleY(1.5); opacity: 1; }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CallModal;
