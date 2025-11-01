
import React from 'react';
import type { VoiceName } from '../types';
import { availableVoices } from '../types';

interface VoiceSelectorProps {
  voice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  disabled: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voice, onVoiceChange, disabled }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onVoiceChange(event.target.value as VoiceName);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="voice-selector" className="text-sm font-medium text-gray-300">
        Voice:
      </label>
      <select
        id="voice-selector"
        value={voice}
        onChange={handleChange}
        disabled={disabled}
        className={`bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-1.5
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {availableVoices.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
};
