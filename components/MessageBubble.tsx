import React, { useState } from 'react';
import { Message, Role, UserSettings } from '../types';
import { UserIcon, RobotIcon, CopyIcon, CheckIcon, ThumbsUpIcon, ThumbsDownIcon } from './Icons';

interface MessageBubbleProps {
  message: Message;
  userSettings?: UserSettings;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, userSettings }) => {
  const isUser = message.role === Role.USER;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    if (feedback === type) {
      setFeedback(null); // toggle off
    } else {
      setFeedback(type);
    }
  };

  // Simple formatter to handle code blocks and newlines without heavy libraries
  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Code block
        const content = part.slice(3, -3).replace(/^[a-z]+\n/, ''); // remove language identifier if present
        return (
          <div key={index} className="my-3 rounded-md overflow-hidden bg-gray-900 text-gray-100 text-sm font-mono" dir="ltr">
            <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 text-left">
              Code
            </div>
            <pre className="p-3 overflow-x-auto whitespace-pre-wrap break-all">
              <code>{content.trim()}</code>
            </pre>
          </div>
        );
      } else {
        // Regular text with bold support
        // Split by bold markers (**text**)
        const boldParts = part.split(/(\*\*.*?\*\*)/g);
        return (
          <span key={index}>
            {boldParts.map((subPart, subIndex) => {
              if (subPart.startsWith('**') && subPart.endsWith('**')) {
                return <strong key={subIndex} className="font-bold text-gray-900 dark:text-gray-100">{subPart.slice(2, -2)}</strong>;
              }
              return subPart;
            })}
          </span>
        );
      }
    });
  };

  const displayName = isUser 
    ? (userSettings?.name || 'تۆ') 
    : 'ئەنەس';

  return (
    <div className={`flex w-full ${isUser ? 'justify-start' : 'justify-start'} mb-6 px-4 group`}>
      <div className={`flex max-w-3xl w-full gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm overflow-hidden border border-gray-100 ${
          isUser 
            ? (userSettings?.avatar ? 'bg-white' : 'bg-blue-600') 
            : 'bg-emerald-600'
        }`}>
          {isUser ? (
             userSettings?.avatar ? (
               <img src={userSettings.avatar} alt="User Avatar" className="w-full h-full object-cover" />
             ) : (
               <UserIcon className="w-5 h-5 text-white" />
             )
          ) : (
            <RobotIcon className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${isUser ? 'text-right' : 'text-right'}`}>
          <div className="font-semibold text-sm text-gray-900 mb-1">
            {displayName}
          </div>
          
          {/* Image Display */}
          {message.image && (
            <div className="mb-3">
              <img 
                src={message.image} 
                alt="Uploaded content" 
                className="max-w-full sm:max-w-sm rounded-lg border border-gray-200 shadow-sm" 
              />
            </div>
          )}

          <div className={`prose prose-sm max-w-none text-base leading-relaxed whitespace-pre-wrap ${
            message.isError ? 'text-red-500' : 'text-gray-800'
          }`}>
            {renderContent(message.text)}
          </div>
          
          {/* Action Buttons (Copy & Feedback) */}
          {!message.isError && (
             <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
               <button 
                 onClick={handleCopy}
                 className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                 aria-label="Copy message"
                 title="کۆپی"
               >
                 {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
                 {copied ? <span className="text-green-600">کۆپی کرا</span> : <span>کۆپی</span>}
               </button>

               {!isUser && (
                 <>
                   <div className="w-px h-3 bg-gray-300"></div>
                   <button 
                     onClick={() => handleFeedback('up')}
                     className={`text-gray-400 hover:text-green-600 transition-colors ${feedback === 'up' ? 'text-green-600' : ''}`}
                     title="بەسوود بوو"
                   >
                     <ThumbsUpIcon className="w-3.5 h-3.5" />
                   </button>
                   <button 
                     onClick={() => handleFeedback('down')}
                     className={`text-gray-400 hover:text-red-500 transition-colors ${feedback === 'down' ? 'text-red-500' : ''}`}
                     title="بەسوود نەبوو"
                   >
                     <ThumbsDownIcon className="w-3.5 h-3.5" />
                   </button>
                 </>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;