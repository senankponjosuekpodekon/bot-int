export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMProvider {
  chat(messages: LLMMessage[]): Promise<string>;
  chatStream(messages: LLMMessage[]): AsyncGenerator<string>;
  embed(text: string, options?: { task?: string }): Promise<number[]>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
