export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface LLMChatResult {
  content: string;
  usage: LLMUsage;
}

export interface LLMProvider {
  chat(messages: LLMMessage[]): Promise<string>;
  generate(messages: LLMMessage[]): Promise<LLMChatResult>;
  chatStream(messages: LLMMessage[]): AsyncGenerator<string>;
  embed(text: string, options?: { task?: string }): Promise<number[]>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
