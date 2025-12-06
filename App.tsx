
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, Role, ChatSession, UserSettings, TextSize, Theme, Voice } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { startChat } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import CallModal from './components/CallModal';
import { SendIcon, PlusIcon, TrashIcon, MenuIcon, RobotIcon, ChatBubbleIcon, XIcon, SettingsIcon, UploadIcon, EditIcon, AttachmentIcon, FileIcon, SunIcon, MoonIcon, PhoneIcon, MicIcon } from './components/Icons';

const STORAGE_KEY = 'kurdgpt_sessions';
const SETTINGS_KEY = 'kurdgpt_user_settings';

const DEFAULT_SETTINGS: UserSettings = {
  name: 'تۆ',
  avatar: null,
  background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
  isBackgroundImage: false,
  textSize: 'medium',
  theme: 'light',
  voice: 'female' // Default voice
};

const PRESET_BACKGROUNDS = [
  { value: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', label: 'فەرمی' },
  { value: '#f0f9ff', label: 'ئاسمانی' },
  { value: '#f0fdf4', label: 'سەوز' },
  { value: '#fafaf9', label: 'گەرم' },
  { value: '#fff1f2', label: 'گوڵ' },
  { value: '#ffffff', label: 'سپی' },
  { value: '#111827', label: 'شەو' },
  { value: '#0f172a', label: 'تاریک' },
];

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ data: string, name: string, type: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load sessions and settings
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    if (savedSessions) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        parsed.sort((a, b) => b.createdAt - a.createdAt);
        setSessions(parsed);
        if (parsed.length > 0) loadSession(parsed[0]);
        else startNewSession();
      } catch (e) {
        startNewSession();
      }
    } else {
      startNewSession();
    }

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        // Merge with defaults to ensure all properties exist
        setUserSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error("Failed to parse settings");
      }
    }
  }, []);

  // Save sessions
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
  }, [userSettings]);

  // Apply Theme
  useEffect(() => {
    if (userSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userSettings.theme]);

  // Sync messages to session
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;
    setSessions(prev => {
      const index = prev.findIndex(s => s.id === currentSessionId);
      if (index === -1) return prev;
      const updatedSession = { ...prev[index], messages };
      if (updatedSession.title === "گفتوگۆی نوێ" && messages.length > 1) {
        const firstUserMsg = messages.find(m => m.role === Role.USER);
        if (firstUserMsg) {
          updatedSession.title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
        }
      }
      const newSessions = [...prev];
      newSessions[index] = updatedSession;
      return newSessions;
    });
  }, [messages, currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const startNewSession = () => {
    const newId = uuidv4();
    const initialMsg: Message = {
      id: uuidv4(),
      role: Role.MODEL,
      text: "بەخێر بێی قوتابیە ئازیزەکەی کارگێڕی بەیانیان گروپی A🌻",
      timestamp: Date.now()
    };
    const newSession: ChatSession = { id: newId, title: "گفتوگۆی نوێ", messages: [initialMsg], createdAt: Date.now() };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([initialMsg]);
    startChat([initialMsg]);
    setSidebarOpen(false);
    setSelectedFile(null);
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    startChat(session.messages);
    setSidebarOpen(false);
    setSelectedFile(null);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
    if (currentSessionId === id) {
      if (newSessions.length > 0) loadSession(newSessions[0]);
      else startNewSession();
    }
  };

  const clearAllHistory = () => {
    if (window.confirm("ئایا دڵنیایت دەتەوێت هەموو مێژووی گفتوگۆکان بسڕیتەوە؟")) {
      setSessions([]);
      localStorage.removeItem(STORAGE_KEY);
      startNewSession();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          data: reader.result as string,
          name: file.name,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => setSelectedFile(null);

  const handleVoiceInput = () => {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("ببورە، وێبگەڕەکەت پشتگیری ئەم تایبەتمەندییە ناکات.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Set language to Kurdish (Sorani) if supported, or fallback to generic
    recognition.lang = 'ckb-IQ'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => {
        const spacer = prev.length > 0 ? ' ' : '';
        return prev + spacer + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;
    const userText = input.trim();
    const userFileData = selectedFile?.data;
    
    setInput('');
    setSelectedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: userText,
      image: userFileData, // Storing data URL here (image or pdf)
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const modelMessageId = uuidv4();
    const initialModelMessage: Message = { id: modelMessageId, role: Role.MODEL, text: '', timestamp: Date.now() };
    setMessages(prev => [...prev, initialModelMessage]);

    try {
      const stream = sendMessageToGemini(userText, userFileData);
      let accumulatedText = '';
      for await (const chunk of stream) {
        accumulatedText += chunk;
        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: accumulatedText } : msg));
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: "داوای لێبوردن دەکەم، کێشەیەک ڕوویدا.", isError: true } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Settings Handlers
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserSettings(prev => ({ ...prev, avatar: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserSettings(prev => ({ 
        ...prev, 
        background: `url(${reader.result as string})`, 
        isBackgroundImage: true 
      }));
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundColor = (e: React.ChangeEvent<HTMLInputElement>) => {
     setUserSettings(prev => ({ 
       ...prev, 
       background: e.target.value, 
       isBackgroundImage: false 
     }));
  };

  const handlePresetSelect = (bg: string) => {
    setUserSettings(prev => ({
      ...prev,
      background: bg,
      isBackgroundImage: false
    }));
  };

  const resetBackground = () => {
    setUserSettings(prev => ({ ...prev, background: DEFAULT_SETTINGS.background, isBackgroundImage: false }));
  };

  return (
    <div 
      className="flex h-screen overflow-hidden font-sans bg-cover bg-center transition-all duration-300"
      style={{ 
        background: userSettings.background,
        backgroundSize: userSettings.isBackgroundImage ? 'cover' : 'auto',
        backgroundPosition: 'center',
        backgroundColor: userSettings.isBackgroundImage ? 'transparent' : userSettings.background
      }}
    >
      
      {/* Call Modal */}
      <CallModal 
        isOpen={showCallModal} 
        onClose={() => setShowCallModal(false)} 
        voice={userSettings.voice} 
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in transition-colors duration-300" dir="rtl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">ڕێکخستنەکان</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Profile Picture */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700 shadow-lg overflow-hidden bg-blue-100 dark:bg-blue-900">
                    {userSettings.avatar ? (
                      <img src={userSettings.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-600">
                        <span className="text-3xl text-white font-bold">{userSettings.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    onChange={handleAvatarUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">وێنەی پڕۆفایل</span>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ناوی تۆ</label>
                <input 
                  type="text" 
                  value={userSettings.name}
                  onChange={(e) => setUserSettings(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all"
                  placeholder="ناوەکەت بنووسە"
                />
              </div>

              {/* Theme Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">شێوازی ڕووکار</label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                   <button 
                     onClick={() => setUserSettings(prev => ({...prev, theme: 'light'}))}
                     className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md transition-all ${
                       userSettings.theme === 'light'
                         ? 'bg-white shadow-sm text-amber-500 font-bold'
                         : 'text-gray-500 dark:text-gray-400'
                     }`}
                   >
                     <SunIcon className="w-4 h-4" />
                     <span className="text-sm">ڕۆژ</span>
                   </button>
                   <button 
                     onClick={() => setUserSettings(prev => ({...prev, theme: 'dark'}))}
                     className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md transition-all ${
                       userSettings.theme === 'dark'
                         ? 'bg-gray-600 shadow-sm text-blue-200 font-bold'
                         : 'text-gray-500 dark:text-gray-400'
                     }`}
                   >
                     <MoonIcon className="w-4 h-4" />
                     <span className="text-sm">شەو</span>
                   </button>
                </div>
              </div>

              {/* Voice Selection */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">دەنگی زیرەک</label>
                 <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button 
                      onClick={() => setUserSettings(prev => ({...prev, voice: 'female'}))}
                      className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md transition-all ${
                        userSettings.voice === 'female'
                          ? 'bg-white dark:bg-gray-600 shadow-sm text-pink-500 dark:text-pink-300 font-bold' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <span className="text-sm">مێینە (کۆری)</span>
                    </button>
                    <button 
                      onClick={() => setUserSettings(prev => ({...prev, voice: 'male'}))}
                      className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md transition-all ${
                        userSettings.voice === 'male'
                          ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-300 font-bold' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <span className="text-sm">نێرینە (فێنریر)</span>
                    </button>
                 </div>
              </div>

              {/* Text Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">قەبارەی نووسین</label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['small', 'medium', 'large'] as TextSize[]).map((size) => (
                    <button 
                      key={size}
                      onClick={() => setUserSettings(prev => ({...prev, textSize: size}))}
                      className={`flex-1 py-2 text-sm rounded-md transition-all ${
                        userSettings.textSize === size 
                          ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-300 font-bold' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {size === 'small' ? 'بچووک' : size === 'medium' ? 'مامناوەند' : 'گەورە'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">پاشبنەما (باکگراوند)</label>
                
                {/* Presets */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                  {PRESET_BACKGROUNDS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetSelect(preset.value)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all shadow-sm ${
                        userSettings.background === preset.value && !userSettings.isBackgroundImage
                          ? 'border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900 scale-110 z-10' 
                          : 'border-gray-100 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ background: preset.value }}
                      title={preset.label}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => bgInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all text-gray-600 dark:text-gray-300"
                  >
                    <UploadIcon className="w-5 h-5" />
                    <span className="text-sm">هەڵبژاردنی وێنە</span>
                  </button>
                  <input 
                    type="file" 
                    ref={bgInputRef} 
                    onChange={handleBackgroundUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  <div className="relative flex items-center justify-center gap-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer overflow-hidden transition-colors">
                     <input 
                       type="color" 
                       onChange={handleBackgroundColor}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                     <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500" style={{ backgroundColor: userSettings.isBackgroundImage ? '#fff' : userSettings.background }}></div>
                     <span className="text-sm text-gray-600 dark:text-gray-300">ڕەنگ</span>
                  </div>
                </div>
                <button onClick={resetBackground} className="text-xs text-blue-600 dark:text-blue-400 mt-3 hover:underline">
                  گەڕانەوە بۆ دۆخی سەرەتایی
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 text-center">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm"
              >
                تەواو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-l border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out z-30 lg:relative lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      } flex flex-col shadow-lg lg:shadow-none`}>
        <div className="p-4 bg-transparent">
          <button 
            onClick={startNewSession}
            className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-95"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">چاتی نوێ</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 px-4 mb-2 mt-2 uppercase tracking-wide">مێژووی گفتوگۆ</div>
          <div className="space-y-1">
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => loadSession(session)}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                  currentSessionId === session.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ChatBubbleIcon className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`} />
                <div className="flex-1 truncate text-sm text-right" dir="rtl">
                  {session.title}
                </div>
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
                  title="سڕینەوە"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
               <div className="px-2 py-8 text-gray-400 dark:text-gray-600 text-sm text-center italic">
                 هیچ مێژوویەک نییە
               </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 space-y-2">
           <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full px-3 py-2.5 rounded-lg">
             <SettingsIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
             <span>ڕێکخستنەکان</span>
           </button>
           <button onClick={clearAllHistory} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
             <TrashIcon className="w-4 h-4" />
             <span>سڕینەوەی هەموو مێژوو</span>
           </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm transition-colors duration-300">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300">
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
             <span className="font-bold text-gray-800 dark:text-white tracking-tight lg:text-lg">ANAS HERE</span>
          </div>

          <button 
             onClick={() => setShowCallModal(true)}
             className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
             title="پەیوەندی دەنگی"
          >
             <PhoneIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto py-8 w-full">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 mt-20 px-6 text-center">
                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-6 transition-colors duration-300">
                   <RobotIcon className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">ئەنەس لێرەیە</h3>
                <p className="max-w-xs text-gray-600 dark:text-gray-400 mb-6">من لێرەم بۆ ئەوەی یارمەتیت بدەم لە خوێندنەکەتدا</p>
                
                <button 
                  onClick={() => setShowCallModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  <PhoneIcon className="w-5 h-5" />
                  <span className="font-bold">پەیوەندی دەنگی بکە</span>
                </button>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} userSettings={userSettings} />
              ))
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            {/* File Preview */}
            {selectedFile && (
              <div className="mb-2 relative inline-flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
                 {selectedFile.type.startsWith('image/') ? (
                   <img src={selectedFile.data} alt="Preview" className="h-16 w-16 object-cover rounded-md" />
                 ) : (
                   <div className="h-16 w-16 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-md">
                     <FileIcon className="w-8 h-8 text-red-500" />
                   </div>
                 )}
                 
                 <div className="flex flex-col pr-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedFile.type.startsWith('image/') ? 'وێنە' : 'فایل'}
                    </span>
                 </div>

                 <button 
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full p-1 hover:bg-red-500 transition-colors shadow-sm"
                 >
                   <XIcon className="w-3 h-3" />
                 </button>
              </div>
            )}

            <div className="relative shadow-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-400 transition-all overflow-hidden flex items-end">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 mb-1 ml-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                title="فایل هاوپێچ بکە"
              >
                <AttachmentIcon className="w-6 h-6" />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="پرسیارەکەت بنووسە ئازیزم..."
                rows={1}
                className="w-full py-4 bg-transparent border-none outline-none resize-none max-h-48 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base"
                style={{ minHeight: '60px' }}
              />

              {/* Voice Input Button */}
              <div className="p-2">
                 <button 
                   onClick={handleVoiceInput}
                   className={`p-2 mb-1 rounded-full transition-all duration-300 ${
                     isListening 
                       ? 'bg-red-500 text-white animate-pulse shadow-red-200 shadow-lg' 
                       : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                   }`}
                   title="دەنگ بۆ نووسین"
                 >
                   <MicIcon className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-2">
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedFile) || isLoading}
                  className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                    (input.trim() || selectedFile) && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md scale-100'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 scale-95 cursor-not-allowed'
                  }`}
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 font-medium shadow-black drop-shadow-sm">
              هیوادارم یارمەتیدەربم، لە هەڵەکانیش ببورە
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
