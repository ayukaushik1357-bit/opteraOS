import { Injectable, Logger } from '@nestjs/common';
import { IAIProvider, AIProviderResponse } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements IAIProvider {
  readonly name = 'GEMINI';
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly apiKey?: string) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateContent(systemPrompt: string, history: any[], tools: any[]): Promise<AIProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('AI_PROVIDER_NOT_CONFIGURED: GEMINI_API_KEY is not defined in environment.');
    }

    const safeHistory = history && history.length > 0 ? history : [{ role: 'user', content: 'Hello' }];
    const messages = safeHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || 'Hello' }],
    }));

    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const body: any = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
      generation_config: { temperature: 0.2, max_output_tokens: 2048 },
    };

    if (functionDeclarations.length > 0) {
      body.tools = [{ function_declarations: functionDeclarations }];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Gemini API Error (${response.status}): ${errText}`);
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const candidate = data?.candidates?.[0]?.content?.parts?.[0];

    const toolCalls: Array<{ name: string; arguments: any }> = [];
    if (candidate?.functionCall) {
      toolCalls.push({
        name: candidate.functionCall.name,
        arguments: candidate.functionCall.args || {},
      });
    }

    const usage = data?.usageMetadata;
    const tokensUsed = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0) || 350;

    return {
      content: candidate?.text || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: 'GEMINI',
      tokensUsed,
      estimatedCost: tokensUsed * 0.0000003, // Gemini 1.5 Flash pricing
      isConfigured: true,
      rawResponse: data,
    };
  }

  async generateContentWithResults(
    systemPrompt: string,
    history: any[],
    toolCalls: any[],
    toolResults: any[],
  ): Promise<AIProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('AI_PROVIDER_NOT_CONFIGURED: GEMINI_API_KEY is not defined in environment.');
    }

    const messages = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      })),
      {
        role: 'model',
        parts: toolCalls.map((tc) => ({ functionCall: { name: tc.name, args: tc.arguments } })),
      },
      {
        role: 'user',
        parts: toolResults.map((tr, i) => ({
          functionResponse: {
            name: toolCalls[i]?.name || 'tool',
            response: { result: tr.result },
          },
        })),
      },
    ];

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
      generation_config: { temperature: 0.2, max_output_tokens: 2048 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Gemini API Error with results (${response.status}): ${errText}`);
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const candidate = data?.candidates?.[0]?.content?.parts?.[0];

    const usage = data?.usageMetadata;
    const tokensUsed = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0) || 500;

    return {
      content: candidate?.text || 'Operation completed.',
      provider: 'GEMINI',
      tokensUsed,
      estimatedCost: tokensUsed * 0.0000003,
      isConfigured: true,
      rawResponse: data,
    };
  }
}
