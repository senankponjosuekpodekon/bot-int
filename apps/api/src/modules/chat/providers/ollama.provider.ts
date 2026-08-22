import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LLMProvider, LLMMessage } from '../llm-provider.interface';

@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embedModel: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get('OLLAMA_URL', 'http://localhost:11434');
    this.model = config.get('OLLAMA_MODEL', 'llama3.2');
    this.embedModel = config.get('OLLAMA_EMBED_MODEL', this.model);
  }

  getProviderName(): string {
    return 'ollama';
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages,
        stream: false,
      });
      return response.data.message.content;
    } catch (error: any) {
      this.logger.error('Ollama chat failed', error?.message);
      throw new Error('AI service unavailable');
    }
  }

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages,
        stream: true,
      }, { responseType: 'stream' });

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
            if (parsed.done) return;
          } catch { /* skip invalid JSON */ }
        }
      }
    } catch (error: any) {
      this.logger.error('Ollama stream failed', error?.message);
      throw new Error('AI streaming unavailable');
    }
  }

  async embed(text: string, _options?: { task?: string }): Promise<number[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: this.embedModel,
        prompt: text,
      });
      return response.data.embedding;
    } catch (error: any) {
      this.logger.error('Ollama embedding failed', error?.message);
      throw new Error('Embedding service unavailable');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch {
      return false;
    }
  }
}
