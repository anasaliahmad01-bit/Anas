
import React, { useState } from 'react';
import { Message, Role, UserSettings } from '../types';
import { UserIcon, RobotIcon, CopyIcon, CheckIcon, ThumbsUpIcon, ThumbsDownIcon, FileIcon, DownloadIcon, EyeIcon } from './Icons';

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

  const downloadGeneratedFile = (name: string, content: string) => {
    // Determine mime type
    let mimeType = 'text/plain';
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      mimeType = 'application/msword';
      // Add word wrapper for better compatibility
      if (!content.includes('<html')) {
         content = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>${name}</title></head><body>${content}</body></html>
         `;
      }
    } else if (name.endsWith('.ppt') || name.endsWith('.pptx')) {
      mimeType = 'application/vnd.ms-powerpoint';
    } else if (name.endsWith('.html')) {
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printPdf = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print to PDF</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
              @media print { body { padding: 0; } }
              h1, h2, h3 { color: #111827; }
              p { margin-bottom: 1em; color: #374151; }
              table { border-collapse: collapse; width: 100%; margin: 1em 0; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
              th { background-color: #f9fafb; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Helper to determine attachment type
  const getAttachmentType = (dataUrl: string) => {
    if (dataUrl.startsWith('data:image')) return 'image';
    if (dataUrl.startsWith('data:application/pdf')) return 'pdf';
    return 'unknown';
  };

  // Formatter to handle code blocks, bold text, AND file generation tags
  const renderContent = (text: string) => {
    // 1. Check for file generation tag: <generated_file name="...">...</generated_file>
    const fileRegex = /<generated_file name="([^"]+)">([\s\S]*?)<\/generated_file>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = fileRegex.exec(text)) !== null) {
      // Push text before the match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      
      // Push the file match
      parts.push({ 
        type: 'file', 
        filename: match[1], 
        fileContent: match[2] 
      });
      
      lastIndex = fileRegex.lastIndex;
    }
    
    // Push remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts.map((part, partIndex) => {
      if (part.type === 'file') {
        const isPdf = part.filename?.toLowerCase().endsWith('.html') && text.includes('PDF'); // Heuristic or just generic
        const actualIsPdf = part.filename?.toLowerCase().endsWith('.pdf') || (part.filename?.toLowerCase().endsWith('.html') && text.toLowerCase().includes('pdf'));
        // If the AI named it .pdf, we still treat content as HTML but use Print method
        
        return (
          <div key={`file-${partIndex}`} className="my-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-between gap-4 group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center gap-4 overflow-hidden">
               <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg flex-shrink-0">
                 <FileIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
               </div>
               <div className="min-w-0">
                 <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate text-left" dir="ltr">{part.filename}</h4>
                 <p className="text-xs text-gray-500 dark:text-gray-400 text-left">Generated File</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* For generic downloads */}
              {!actualIsPdf && (
                <button 
                  onClick={() => downloadGeneratedFile(part.filename!, part.fileContent!)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">داگرتن</span>
                </button>
              )}

              {/* For PDF/Print Preview */}
              {(actualIsPdf || part.filename?.endsWith('.html')) && (
                 <button 
                   onClick={() => printPdf(part.fileContent!)}
                   className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                   title="Print / Save as PDF"
                 >
                   <EyeIcon className="w-4 h-4" />
                   <span className="hidden sm:inline">{actualIsPdf ? 'PDF / چاپ' : 'بینین'}</span>
                 </button>
              )}
            </div>
          </div>
        );
      } else {
        // Standard Text Rendering (Markdownish)
        return renderMarkdown(part.content!);
      }
    });
  };

  const renderMarkdown = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const content = part.slice(3, -3).replace(/^[a-z]+\n/, ''); 
        return (
          <div key={index} className="my-3 rounded-md overflow-hidden bg-gray-900 text-gray-100 text-sm font-mono" dir="ltr">
            <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 text-left">Code</div>
            <pre className="p-3 overflow-x-auto whitespace-pre-wrap break-all">
              <code>{content.trim()}</code>
            </pre>
          </div>
        );
      } else {
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
  }

  const displayName = isUser 
    ? (userSettings?.name || 'تۆ') 
    : 'ئەنەس';

  const attachmentType = message.image ? getAttachmentType(message.image) : null;

  const textSizeClass = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  }[userSettings?.textSize || 'medium'];

  // Check if the AI is thinking (model role + empty text + no error)
  const isThinking = message.role === Role.MODEL && !message.text && !message.isError;

  return (
    <div className={`flex w-full ${isUser ? 'justify-start' : 'justify-start'} mb-6 px-4 group`}>
      <div className={`flex max-w-3xl w-full gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 ${
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
          <div className="font-semibold text-sm text-gray-900 dark:text-gray-200 mb-1">
            {displayName}
          </div>
          
          {/* Attachment Display */}
          {message.image && (
            <div className="mb-3">
              {attachmentType === 'image' && (
                <img 
                  src={message.image} 
                  alt="Uploaded content" 
                  className="max-w-full sm:max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" 
                />
              )}
              {attachmentType === 'pdf' && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-w-xs">
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <FileIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">فایلی PDF</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">هاوپێچ کراوە</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`prose prose-sm max-w-none ${textSizeClass} leading-relaxed whitespace-pre-wrap ${
            message.isError ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'
          }`}>
            {isThinking ? (
              <div className="flex items-center gap-1.5 py-2 h-8" dir="ltr">
                 <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              renderContent(message.text)
            )}
          </div>
          
          {/* Action Buttons */}
          {!message.isError && !isThinking && (
             <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
               <button 
                 onClick={handleCopy}
                 className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                 title="کۆپی"
               >
                 {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
                 {copied ? <span className="text-green-600">کۆپی کرا</span> : <span>کۆپی</span>}
               </button>

               {!isUser && (
                 <>
                   <div className="w-px h-3 bg-gray-300 dark:bg-gray-700"></div>
                   <button 
                     onClick={() => handleFeedback('up')}
                     className={`text-gray-400 hover:text-green-600 dark:hover:text-green-500 transition-colors ${feedback === 'up' ? 'text-green-600 dark:text-green-500' : ''}`}
                     title="بەسوود بوو"
                   >
                     <ThumbsUpIcon className="w-3.5 h-3.5" />
                   </button>
                   <button 
                     onClick={() => handleFeedback('down')}
                     className={`text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ${feedback === 'down' ? 'text-red-500 dark:text-red-400' : ''}`}
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
