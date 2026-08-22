import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaProvider } from './providers/ollama.provider';
import { LLMMessage } from './llm-provider.interface';

export type OllamaMessage = LLMMessage;

/**
 * @deprecated Use LLMService instead. This wrapper exists for backward compatibility.
 */
@Injectable()
export class OllamaService extends OllamaProvider {
  constructor(config: ConfigService) {
    super(config);
  }
}
