
import { GoogleGenAI, LiveServerMessage, Modality, Blob, LiveSession } from "@google/genai";
import type { Message, Status, LanguageAccentCode, VoiceName, LanguageCode } from '../types';

// Audio Encoding & Decoding functions
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const getSystemInstruction = (languageAccentCode: LanguageAccentCode): string => {
    const [language, accent] = languageAccentCode.split('-') as [LanguageCode, string];

    const customerDetails = `
---
APPLE IDEVICE VOUCHER CLAIM VALIDATION PORTAL
Date: 22/07/2025, 03:22 PM

CUSTOMER DETAILS:
Name: HAZRY HAQIMI BIN ROHAIZAD
Email: qimihazryx@gmail.com
Phone: 0175745367

DELIVERY ADDRESS:
Blok G4-14, RKAT Desa Tun Hussein Onn, 54200 Kuala Lumpur, WP Kuala Lumpur

CLAIM STATUS:
Registration Status: In Progress
Applicant Claim ID: SHZ022126

DEVICE DETAILS:
Device Model: iPhone 14 Pro Max
Description: Premium smartphone with A17 Pro chip, ProMotion display, titanium design, and professional camera system. Features 48MP main camera, Action button.

ACTIVATION INFORMATION:
Your iDevice is not yet activated for delivery. To activate, you need to select a preferred storage option with an iDevice claim agent.
Available Storage Options: 128GB, 256GB, 512GB, 1TB.
For activation, visit: https://activate.apple.com
---
`;

    const instructions: Record<LanguageCode, Record<string, string>> = {
      english: {
        base: `You are a friendly and helpful customer support agent answering questions about a customer's voucher claim. Use ONLY the information provided in the document below to answer questions. If asked about something not in the document, politely state that you do not have that information. Keep your responses concise and directly related to the user's query.`,
        us: ``, // No special instructions for US, it's the default
        uk: `Please use British English spelling and phrasing where appropriate (e.g., 'organisation' instead of 'organization', 'full stop' instead of 'period').`,
      },
      malay: {
        base: `Anda ialah ejen sokongan pelanggan yang mesra dan sedia membantu, menjawab soalan mengenai tuntutan baucar pelanggan. Gunakan HANYA maklumat yang diberikan dalam dokumen di bawah untuk menjawab soalan. Jika ditanya mengenai sesuatu yang tiada dalam dokumen, nyatakan dengan sopan bahawa anda tidak mempunyai maklumat tersebut. Pastikan jawapan anda ringkas dan berkaitan terus dengan pertanyaan pengguna.`
      },
      spanish: {
        base: `Eres un amigable y útil agente de soporte al cliente respondiendo preguntas sobre el reclamo de un cupón de un cliente. Usa SOLAMENTE la información proporcionada en el siguiente documento para responder preguntas. Si se te pregunta algo que no está en el documento, amablemente indica que no tienes esa información. Mantén tus respuestas concisas y directamente relacionadas con la consulta del usuario.`,
        es: `Utiliza el español de España (castellano).`,
        mx: `Utiliza el español de México.`,
      },
      french: {
        base: `Vous êtes un agent de support client amical et serviable qui répond aux questions concernant la réclamation d'un bon d'achat d'un client. Utilisez UNIQUEMENT les informations fournies dans le document ci-dessous pour répondre aux questions. Si on vous interroge sur quelque chose qui ne figure pas dans le document, déclarez poliment que vous ne disposez pas de cette information. Gardez vos réponses concises et directement liées à la requête de l'utilisateur.`,
        fr: `Utilisez le français de France.`,
        ca: `Utilisez le français canadien et les expressions québécoises appropriées.`,
      }
    };
    
    const langInstructions = instructions[language];
    const baseInstruction = langInstructions.base;
    const accentInstruction = langInstructions[accent] || '';

    return `${baseInstruction} ${accentInstruction}\n\nHere is the customer's document:\n${customerDetails}`;
};


export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<LiveSession> | null = null;
  
  private onMessageUpdate: (messages: Message[]) => void;
  private onStatusUpdate: (status: Status) => void;
  private onError: (error: string) => void;

  private messages: Message[] = [];
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  private processingTimer: ReturnType<typeof setTimeout> | null = null;


  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  private outputAudioSources = new Set<AudioBufferSourceNode>();
  private nextAudioStartTime = 0;
  
  private isMuted = false;
  private isHeld = false;


  constructor(
    onMessageUpdate: (messages: Message[]) => void,
    onStatusUpdate: (status: Status) => void,
    onError: (error: string) => void,
  ) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.onMessageUpdate = onMessageUpdate;
    this.onStatusUpdate = onStatusUpdate;
    this.onError = onError;
  }

  private addOrUpdateMessage(sender: 'user' | 'model', text: string, isFinal: boolean) {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.sender === sender && !lastMessage.isFinal) {
      lastMessage.text = text;
      lastMessage.isFinal = isFinal;
    } else {
      this.messages.push({
        id: Date.now().toString() + Math.random(),
        sender,
        text,
        isFinal,
        translations: {},
      });
    }
    this.onMessageUpdate([...this.messages]);
  }

  public async start(languageAccentCode: LanguageAccentCode, voice: VoiceName) {
    this.messages = [];
    this.onMessageUpdate([]);
    this.onStatusUpdate('connecting');

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone access denied:", err);
      this.onError("Microphone access is required. Please allow microphone permissions in your browser.");
      return;
    }

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const systemInstruction = getSystemInstruction(languageAccentCode);

    this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
            systemInstruction,
        },
        callbacks: {
            onopen: () => this.handleSessionOpen(),
            onmessage: (message: LiveServerMessage) => this.handleSessionMessage(message),
            onerror: (e: ErrorEvent) => this.handleSessionError(e),
            onclose: (e: CloseEvent) => this.handleSessionClose(e),
        },
    });
     await this.sessionPromise;
  }

  private handleSessionOpen() {
    this.onStatusUpdate('listening');
    if (!this.microphoneStream || !this.inputAudioContext) return;

    this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(this.microphoneStream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        if (this.isMuted || this.isHeld) {
            return;
        }
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBlob: Blob = {
            data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
        if(this.sessionPromise){
            this.sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        }
    };
    this.mediaStreamSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleSessionMessage(message: LiveServerMessage) {
    if (message.serverContent?.inputTranscription) {
      if (this.processingTimer) clearTimeout(this.processingTimer);
      this.processingTimer = setTimeout(() => {
        if (this.currentInputTranscription) {
            this.onStatusUpdate('processing');
        }
      }, 1200);

      const { text } = message.serverContent.inputTranscription;
      this.currentInputTranscription += text;
      this.addOrUpdateMessage('user', this.currentInputTranscription, false);
    }

    if (message.serverContent?.outputTranscription) {
        if (this.processingTimer) clearTimeout(this.processingTimer);
        
        if(this.currentInputTranscription) {
             this.addOrUpdateMessage('user', this.currentInputTranscription, true);
             this.currentInputTranscription = '';
        }
        this.onStatusUpdate('speaking');
        const { text } = message.serverContent.outputTranscription;
        this.currentOutputTranscription += text;
        this.addOrUpdateMessage('model', this.currentOutputTranscription, false);
    }
    
    if (message.serverContent?.turnComplete) {
        if(this.currentOutputTranscription){
             this.addOrUpdateMessage('model', this.currentOutputTranscription, true);
        }
        this.currentInputTranscription = '';
        this.currentOutputTranscription = '';
        this.onStatusUpdate('listening');
    }
    
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
    if (base64Audio && this.outputAudioContext) {
      this.nextAudioStartTime = Math.max(this.nextAudioStartTime, this.outputAudioContext.currentTime);
      const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      source.addEventListener('ended', () => { this.outputAudioSources.delete(source); });
      source.start(this.nextAudioStartTime);
      this.nextAudioStartTime += audioBuffer.duration;
      this.outputAudioSources.add(source);
    }

    if (message.serverContent?.interrupted) {
        for (const source of this.outputAudioSources.values()) {
          source.stop();
          this.outputAudioSources.delete(source);
        }
        this.nextAudioStartTime = 0;
      }
  }

  private handleSessionError(e: ErrorEvent) {
    console.error("Session error:", e);
    this.onError("A connection error occurred. Please try again.");
    this.stop();
  }

  private handleSessionClose(e: CloseEvent) {
    console.log("Session closed:", e);
    this.stop();
    this.onStatusUpdate('idle');
  }
  
  public toggleMute() {
    this.isMuted = !this.isMuted;
  }
  
  public toggleHold() {
      this.isHeld = !this.isHeld;
      if (this.isHeld) {
          this.outputAudioContext?.suspend();
      } else {
          this.outputAudioContext?.resume();
      }
  }

  public stop() {
    if (this.processingTimer) clearTimeout(this.processingTimer);
    this.processingTimer = null;

    this.sessionPromise?.then(session => session.close()).catch(console.error);
    this.sessionPromise = null;
    
    this.scriptProcessor?.disconnect();
    this.mediaStreamSource?.disconnect();
    this.scriptProcessor = null;
    this.mediaStreamSource = null;
    
    this.microphoneStream?.getTracks().forEach(track => track.stop());
    this.microphoneStream = null;
    
    this.inputAudioContext?.close().catch(console.error);
    this.outputAudioContext?.close().catch(console.error);
    this.inputAudioContext = null;
    this.outputAudioContext = null;

    this.currentInputTranscription = '';
    this.currentOutputTranscription = '';
    
    for (const source of this.outputAudioSources.values()) {
        source.stop();
    }
    this.outputAudioSources.clear();
    this.nextAudioStartTime = 0;
    
    this.isMuted = false;
    this.isHeld = false;
  }
}