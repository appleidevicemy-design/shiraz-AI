
import React, { useState, useRef, useCallback } from 'react';
import type { Message, Status, LanguageAccentCode } from './types';
import { languageOptions } from './types';
import { GeminiLiveService } from './services/geminiService';
import { TranslationService } from './services/translationService';
import { Conversation } from './components/Conversation';
import { Controls } from './components/Controls';
import { Logo } from './components/icons/Logo';
import { LanguageSelector } from './components/LanguageSelector';

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [languageAccent, setLanguageAccent] = useState<LanguageAccentCode>('english-us');
  const [conversationLanguage, setConversationLanguage] = useState<LanguageAccentCode>('english-us');
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const geminiServiceRef = useRef<GeminiLiveService | null>(null);
  const translationServiceRef = useRef(new TranslationService());

  const handleMessageUpdate = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  const handleStatusUpdate = useCallback((newStatus: Status) => {
    setStatus(newStatus);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setStatus('error');
  }, []);

  const startConversation = async () => {
    setError(null);
    setMessages([]);
    setStatus('connecting');
    setConversationLanguage(languageAccent);

    const [lang, accent] = languageAccent.split('-');
    const langOption = languageOptions.find(l => l.code === lang);
    const accentOption = langOption?.accents.find(a => a.code === accent);
    const voice = accentOption?.voice || 'Kore'; // Fallback voice

    try {
      if (!geminiServiceRef.current) {
        geminiServiceRef.current = new GeminiLiveService(
          handleMessageUpdate,
          handleStatusUpdate,
          handleError
        );
      }
      await geminiServiceRef.current.start(languageAccent, voice);
    } catch (e) {
      const err = e as Error;
      console.error(err);
      handleError(err.message || 'Failed to start the session.');
    }
  };

  const stopConversation = () => {
    if (geminiServiceRef.current) {
      geminiServiceRef.current.stop();
      geminiServiceRef.current = null;
    }
    setStatus('idle');
    setIsMuted(false);
    setIsHeld(false);
  };
  
  const handleToggleMute = () => {
    geminiServiceRef.current?.toggleMute();
    setIsMuted(prev => !prev);
  };

  const handleToggleHold = () => {
    geminiServiceRef.current?.toggleHold();
    setIsHeld(prev => !prev);
  };

  const handleLanguageAccentChange = async (newLangAccent: LanguageAccentCode) => {
    setLanguageAccent(newLangAccent);

    if (newLangAccent === conversationLanguage || messages.length === 0) {
      return;
    }

    const translationsNeeded = messages.filter(msg => !msg.translations?.[newLangAccent]);
    if (translationsNeeded.length === 0) {
      return;
    }
    
    setIsTranslating(true);

    try {
      const translationPromises = translationsNeeded.map(msg =>
        translationServiceRef.current.translateText(msg.text, newLangAccent, conversationLanguage)
      );
      const results = await Promise.all(translationPromises);

      setMessages(currentMessages => {
        const updatedMessages = JSON.parse(JSON.stringify(currentMessages));
        let resultIndex = 0;
        for (const msg of updatedMessages) {
          if (!msg.translations?.[newLangAccent]) {
            if (!msg.translations) msg.translations = {};
            msg.translations[newLangAccent] = results[resultIndex++];
          }
        }
        return updatedMessages;
      });
    } catch (error) {
      console.error("Failed to translate messages:", error);
      setError("Could not translate the conversation.");
    } finally {
      setIsTranslating(false);
    }
  };


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="flex items-center justify-between p-4 border-b border-gray-700 shadow-lg flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Logo />
          <h1 className="text-xl font-bold text-cyan-400">Gemini Live Customer Agent</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector
            selectedAccentCode={languageAccent}
            onAccentChange={handleLanguageAccentChange}
            disabled={isTranslating || status !== 'idle'}
          />
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="flex-grow mb-4 overflow-y-auto rounded-lg bg-gray-800/50 p-4 shadow-inner">
          <Conversation 
            messages={messages} 
            status={status} 
            languageAccent={languageAccent}
            conversationLanguage={conversationLanguage}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-300 border border-red-500/50">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex-shrink-0">
          <Controls 
            status={status} 
            onStart={startConversation} 
            onStop={stopConversation}
            isMuted={isMuted}
            isHeld={isHeld}
            onToggleMute={handleToggleMute}
            onToggleHold={handleToggleHold}
          />
        </div>
      </main>
      
      <footer className="text-center p-3 text-xs text-gray-500 border-t border-gray-700">
        This app uses the Gemini Live API for real-time voice interaction. Ensure your microphone is enabled.
      </footer>
    </div>
  );
};

export default App;