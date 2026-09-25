import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAIProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';

@Injectable()
export class AIProviderFactory {
  constructor(private config: ConfigService) {}

  getProvider(): IAIProvider | null {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    if (geminiKey && geminiKey.trim().length > 0) {
      return new GeminiProvider(geminiKey.trim());
    }

    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (openaiKey && openaiKey.trim().length > 0) {
      return new OpenAIProvider(openaiKey.trim());
    }

    return null;
  }

  getProviderStatus(): { configured: boolean; provider: 'GEMINI' | 'OPENAI' | null } {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    if (geminiKey && geminiKey.trim().length > 0) {
      return { configured: true, provider: 'GEMINI' };
    }

    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (openaiKey && openaiKey.trim().length > 0) {
      return { configured: true, provider: 'OPENAI' };
    }

    return { configured: false, provider: null };
  }
}
