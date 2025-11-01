export type Status = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export type LanguageCode = 'english' | 'malay' | 'spanish' | 'french';
export type VoiceName = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
// Fix: Export `availableVoices` to resolve the import error in `VoiceSelector.tsx`.
export const availableVoices: VoiceName[] = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];

export interface Accent {
  name: string;
  code: string; // e.g., 'us', 'uk'
  voice: VoiceName;
}

export interface LanguageOption {
  name: string;
  code: LanguageCode;
  accents: Accent[];
}

export const languageOptions: LanguageOption[] = [
  { 
    name: 'English', 
    code: 'english', 
    accents: [
      { name: 'American', code: 'us', voice: 'Zephyr' }, 
      { name: 'British', code: 'uk', voice: 'Puck' }
    ] 
  },
  { 
    name: 'Malay', 
    code: 'malay', 
    accents: [
      { name: 'Standard', code: 'my', voice: 'Kore' }
    ] 
  },
  { 
    name: 'Spanish', 
    code: 'spanish', 
    accents: [
      { name: 'Spain', code: 'es', voice: 'Charon' },
      { name: 'Mexican', code: 'mx', voice: 'Kore' }
    ] 
  },
  { 
    name: 'French', 
    code: 'french', 
    accents: [
      { name: 'France', code: 'fr', voice: 'Fenrir' },
      { name: 'Canadian', code: 'ca', voice: 'Zephyr' }
    ] 
  }
];

// This will be the type for state, e.g., 'english-us'
export type LanguageAccentCode = string;


export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'model';
  isFinal: boolean;
  translations?: Partial<Record<LanguageAccentCode, string>>;
}
