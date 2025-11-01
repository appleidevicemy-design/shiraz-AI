
import React from 'react';
import type { Status } from '../types';
import { MicIcon } from './icons/MicIcon';
import { StopIcon } from './icons/StopIcon';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { MicSlashIcon } from './icons/MicSlashIcon';
import { PauseIcon } from './icons/PauseIcon';
import { PlayIcon } from './icons/PlayIcon';

interface ControlsProps {
  status: Status;
  onStart: () => void;
  onStop: () => void;
  isMuted: boolean;
  isHeld: boolean;
  onToggleMute: () => void;
  onToggleHold: () => void;
}

const statusInfo: { [key in Status]: { text: string; color: string } } = {
  idle: { text: 'Click the mic to start', color: 'text-gray-400' },
  connecting: { text: 'Connecting to Gemini...', color: 'text-yellow-400' },
  listening: { text: 'Listening... Speak now.', color: 'text-green-400' },
  processing: { text: 'Gemini is thinking...', color: 'text-yellow-400' },
  speaking: { text: 'Gemini is speaking...', color: 'text-cyan-400' },
  error: { text: 'An error occurred', color: 'text-red-400' },
};

export const Controls: React.FC<ControlsProps> = ({ status, onStart, onStop, isMuted, isHeld, onToggleMute, onToggleHold }) => {
  let { text, color } = statusInfo[status];
  const isRecording = status === 'listening' || status === 'speaking' || status === 'connecting' || status === 'processing';
  
  if (isRecording && isHeld) {
    text = 'Conversation is on hold';
    color = 'text-yellow-400';
  } else if (isRecording && isMuted) {
    text = 'You are muted';
    color = 'text-gray-400';
  }

  const mainButtonClasses = `relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 ${
    isRecording
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50'
      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50'
  }`;
  
  const secondaryButtonClasses = `w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
    'bg-gray-700 hover:bg-gray-600 text-gray-300 focus:ring-gray-500'
  }`;


  return (
    <div className="flex flex-col items-center justify-center space-y-3">
        <div className="flex items-center justify-center gap-x-4 md:gap-x-6 h-20">
            {isRecording && (
                <button
                    onClick={onToggleMute}
                    className={secondaryButtonClasses}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicSlashIcon /> : <MicIcon />}
                </button>
            )}

            <button
                onClick={isRecording ? onStop : onStart}
                disabled={status === 'connecting'}
                className={mainButtonClasses}
                aria-label={isRecording ? 'Stop conversation' : 'Start conversation'}
            >
                {status === 'connecting' && <LoadingSpinner />}
                {status !== 'connecting' && (isRecording ? <StopIcon /> : <MicIcon />)}
                {status === 'listening' && !isMuted && !isHeld && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
            </button>

            {isRecording && (
                 <button
                    onClick={onToggleHold}
                    className={secondaryButtonClasses}
                    aria-label={isHeld ? 'Resume' : 'Hold'}
                 >
                    {isHeld ? <PlayIcon /> : <PauseIcon />}
                 </button>
            )}
        </div>
        <p className={`text-sm md:text-base font-medium h-6 ${color}`}>{text}</p>
    </div>
  );
};