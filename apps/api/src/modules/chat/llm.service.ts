import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LLMProvider, LLMMessage, LLMChatResult } from './llm-provider.interface';
import { LLM_PROVIDER } from './llm-provider.interface';;

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(@Inject(LLM_PROVIDER) private readonly provider: LLMProvider) {}

  getProviderName(): string {
    return this.provider.getProviderName();
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    return this.provider.chat(messages);
  }

  async generate(messages: LLMMessage[]): Promise<LLMChatResult> {
    return this.provider.generate(messages);
  }

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    yield* this.provider.chatStream(messages);
  }

  async embed(text: string, options?: { task?: string }): Promise<number[]> {
    return this.provider.embed(text, options);
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }
}
