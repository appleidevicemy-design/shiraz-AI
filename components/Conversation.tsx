
import React, { useEffect, useRef, useState } from 'react';
import type { Message, Status, LanguageAccentCode } from '../types';
import { ThinkingSpinner } from './icons/ThinkingSpinner';
import { TranslateIcon } from './icons/TranslateIcon';

interface MessageBubbleProps {
  message: Message;
  languageAccent: LanguageAccentCode;
  conversationLanguage: LanguageAccentCode;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, languageAccent, conversationLanguage }) => {
  const [showOriginal, setShowOriginal] = useState(false);

  const isTranslated = languageAccent !== conversationLanguage;
  const originalText = message.text;
  const translatedText = message.translations?.[languageAccent];

  const displayedText = (showOriginal || !isTranslated) ? originalText : translatedText;
  const isTranslationPending = isTranslated && !translatedText;

  const toggleShowOriginal = () => setShowOriginal(prev => !prev);

  return (
    <div
      className={`flex items-start gap-3 ${
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      {message.sender === 'model' && (
        <div className={`w-8 h-8 rounded-full bg-cyan-500 flex-shrink-0 flex items-center justify-center font-bold text-gray-900 ${!message.isFinal ? 'speaking-pulse' : ''}`}>
          AI
        </div>
      )}
      <div
        className={`relative group max-w-xs md:max-w-md lg:max-w-2xl px-4 py-2 rounded-2xl ${
          message.sender === 'user'
            ? 'bg-blue-600 rounded-br-none'
            : 'bg-gray-700 rounded-bl-none'
        }`}
      >
        <p className="text-white whitespace-pre-wrap" style={{ opacity: message.isFinal ? 1 : 0.7 }}>
            {isTranslationPending ? 'Translating...' : (displayedText || '...')}
        </p>
        {isTranslated && message.isFinal && (
          <button 
            onClick={toggleShowOriginal} 
            className="absolute -bottom-2 -right-2 p-1 bg-gray-600 rounded-full text-gray-300 hover:bg-gray-500 transition-opacity opacity-0 group-hover:opacity-100"
            title={showOriginal ? 'Show translation' : 'Show original'}
          >
            <TranslateIcon />
          </button>
        )}
      </div>
      {message.sender === 'user' && (
         <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center font-bold">
          You
        </div>
      )}
    </div>
  );
};


interface ConversationProps {
  messages: Message[];
  status: Status;
  languageAccent: LanguageAccentCode;
  conversationLanguage: LanguageAccentCode;
}

export const Conversation: React.FC<ConversationProps> = ({ messages, status, languageAccent, conversationLanguage }) => {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-lg">No messages yet.</p>
        <p>Click the microphone to start the conversation.</p>
      </div>
    );
  }

  const isAIProcessing = status === 'processing' && messages.length > 0 && messages[messages.length - 1].sender === 'user';

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          languageAccent={languageAccent}
          conversationLanguage={conversationLanguage}
        />
      ))}

      {isAIProcessing && (
         <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex-shrink-0 flex items-center justify-center font-bold text-gray-900">
              AI
            </div>
            <div className="max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl bg-gray-700 rounded-bl-none">
                <ThinkingSpinner />
            </div>
        </div>
      )}

      <div ref={endOfMessagesRef} />
    </div>
  );
};