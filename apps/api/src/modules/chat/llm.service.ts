import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDER, LLMProvider, LLMMessage } from './llm-provider.interface';

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

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    yield* this.provider.chatStream(messages);
  }

  async embed(text: string): Promise<number[]> {
    return this.provider.embed(text);
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }
}
