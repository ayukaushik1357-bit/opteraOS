import { Injectable, Logger } from '@nestjs/common';
import { IAIProvider, AIProviderResponse } from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements IAIProvider {
  readonly name = 'OPENAI';
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly apiKey?: string) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateContent(systemPrompt: string, history: any[], tools: any[]): Promise<AIProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('AI_PROVIDER_NOT_CONFIGURED: OPENAI_API_KEY is not defined in environment.');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content || '' })),
    ];

    const openAiTools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const body: any = {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
    };

    if (openAiTools.length > 0) {
      body.tools = openAiTools;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`OpenAI API Error (${response.status}): ${errText}`);
      throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const choice = data?.choices?.[0];

    const toolCalls: Array<{ name: string; arguments: any }> = [];
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        try {
          toolCalls.push({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}'),
          });
        } catch {
          toolCalls.push({ name: tc.function.name, arguments: {} });
        }
      }
    }

    const tokensUsed = data?.usage?.total_tokens || 400;

    return {
      content: choice?.message?.content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: 'OPENAI',
      tokensUsed,
      estimatedCost: tokensUsed * 0.0000006, // gpt-4o-mini pricing
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
      throw new Error('AI_PROVIDER_NOT_CONFIGURED: OPENAI_API_KEY is not defined in environment.');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content || '' })),
      {
        role: 'assistant',
        content: null,
        tool_calls: toolCalls.map((tc, i) => ({
          id: `call_${i}`,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
        })),
      },
      ...toolResults.map((tr, i) => ({
        role: 'tool',
        tool_call_id: `call_${i}`,
        content: JSON.stringify(tr.result),
      })),
    ];

    const body = {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`OpenAI API Error with results (${response.status}): ${errText}`);
      throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    const choice = data?.choices?.[0];
    const tokensUsed = data?.usage?.total_tokens || 550;

    return {
      content: choice?.message?.content || 'Operation completed.',
      provider: 'OPENAI',
      tokensUsed,
      estimatedCost: tokensUsed * 0.0000006,
      isConfigured: true,
      rawResponse: data,
    };
  }
}
