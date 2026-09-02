export interface AIProviderResponse {
  content: string;
  toolCalls?: Array<{ name: string; arguments: any }>;
  provider: 'GEMINI' | 'OPENAI' | 'TEST_MOCK';
  tokensUsed?: number;
  estimatedCost?: number;
  isConfigured: boolean;
  rawResponse?: any;
}

export interface IAIProvider {
  readonly name: 'GEMINI' | 'OPENAI' | 'TEST_MOCK';
  isConfigured(): boolean;
  generateContent(systemPrompt: string, history: any[], tools: any[]): Promise<AIProviderResponse>;
  generateContentWithResults(
    systemPrompt: string,
    history: any[],
    toolCalls: any[],
    toolResults: any[],
  ): Promise<AIProviderResponse>;
}
