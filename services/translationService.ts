
import { GoogleGenAI } from "@google/genai";
import type { LanguageAccentCode } from "../types";

export class TranslationService {
  private ai: GoogleGenAI;
  private cache = new Map<string, string>();

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async translateText(text: string, targetLanguageAccent: LanguageAccentCode, sourceLanguageAccent: LanguageAccentCode): Promise<string> {
    const cacheKey = `${targetLanguageAccent}:${sourceLanguageAccent}:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const sourceLanguage = sourceLanguageAccent.split('-')[0];
    const targetLanguage = targetLanguageAccent.split('-')[0];
    
    if (targetLanguage === sourceLanguage || !text) {
        return text;
    }

    try {
      const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Provide ONLY the raw translated text, without any additional explanations, formatting, or quotation marks.\n\nText: "${text}"\n\nTranslation:`;
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      const translatedText = response.text.trim();
      this.cache.set(cacheKey, translatedText);
      return translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Fallback to original text on error
    }
  }
}