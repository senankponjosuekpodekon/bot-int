import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMMessage, LLMChatResult } from '../llm-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { OllamaProvider } from './ollama.provider';

@Injectable()
export class FallbackLLMProvider implements LLMProvider {
  private readonly logger = new Logger(FallbackLLMProvider.name);
  private readonly primary: LLMProvider;
  private readonly fallback: LLMProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly openai: OpenAIProvider,
    private readonly ollama: OllamaProvider,
  ) {
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    if (provider === 'ollama') {
      this.primary = this.ollama;
      this.fallback = this.openai;
    } else {
      this.primary = this.openai;
      this.fallback = this.ollama;
    }
  }

  getProviderName(): string {
    return 'fallback';
  }

  async isAvailable(): Promise<boolean> {
    const primaryOk = await this.primary.isAvailable().catch(() => false);
    const fallbackOk = await this.fallback.isAvailable().catch(() => false);
    return primaryOk || fallbackOk;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    if (await this.primary.isAvailable()) {
      try {
        return await this.primary.chat(messages);
      } catch (err: any) {
        this.logger.warn(
          `${this.primary.getProviderName()} chat failed, falling back to ${this.fallback.getProviderName()}: ${err.message}`,
        );
      }
    }
    return this.fallback.chat(messages);
  }

  async generate(messages: LLMMessage[]): Promise<LLMChatResult> {
    if (await this.primary.isAvailable()) {
      try {
        return await this.primary.generate(messages);
      } catch (err: any) {
        this.logger.warn(
          `${this.primary.getProviderName()} generate failed, falling back to ${this.fallback.getProviderName()}: ${err.message}`,
        );
      }
    }
    return this.fallback.generate(messages);
  }

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    if (await this.primary.isAvailable()) {
      let gen = this.primary.chatStream(messages);
      let first: IteratorResult<string, any>;
      try {
        first = await gen.next();
      } catch (err: any) {
        this.logger.warn(
          `${this.primary.getProviderName()} stream start failed, falling back to ${this.fallback.getProviderName()}: ${err.message}`,
        );
        gen = this.fallback.chatStream(messages);
        first = await gen.next();
      }
      if (!first.done) {
        yield first.value as string;
      }
      for await (const chunk of gen) {
        yield chunk;
      }
    } else {
      yield* this.fallback.chatStream(messages);
    }
  }

  async embed(text: string, options?: { task?: string }): Promise<number[]> {
    if (await this.primary.isAvailable()) {
      try {
        return await this.primary.embed(text, options);
      } catch (err: any) {
        this.logger.warn(
          `${this.primary.getProviderName()} embed failed, falling back to ${this.fallback.getProviderName()}: ${err.message}`,
        );
      }
    }
    return this.fallback.embed(text, options);
  }
}
