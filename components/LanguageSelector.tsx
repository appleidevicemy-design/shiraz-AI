
import React, { useState, useRef, useEffect } from 'react';
import type { LanguageAccentCode } from '../types';
import { languageOptions } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface LanguageSelectorProps {
  selectedAccentCode: LanguageAccentCode;
  onAccentChange: (code: LanguageAccentCode) => void;
  disabled: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedAccentCode, onAccentChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [langCode, accentCode] = selectedAccentCode.split('-');
  const selectedLang = languageOptions.find(l => l.code === langCode);
  const selectedAccent = selectedLang?.accents.find(a => a.code === accentCode);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleAccentClick = (code: LanguageAccentCode) => {
    onAccentChange(code);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2
          bg-gray-700 hover:bg-gray-600 text-gray-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900
        `}
      >
        <span>{selectedLang?.name} ({selectedAccent?.name})</span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {languageOptions.map(lang => (
              <div key={lang.code}>
                <h3 className="px-4 py-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">{lang.name}</h3>
                {lang.accents.map(accent => {
                  const code = `${lang.code}-${accent.code}`;
                  const isActive = code === selectedAccentCode;
                  return (
                    <a
                      key={code}
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleAccentClick(code); }}
                      className={`block px-4 py-2 text-sm ${
                        isActive ? 'bg-cyan-500 text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                      role="menuitem"
                    >
                      {accent.name}
                    </a>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};