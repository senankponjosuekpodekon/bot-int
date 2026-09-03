import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LLMProvider, LLMMessage, LLMChatResult } from '../llm-provider.interface';

@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embedModel: string;
  private readonly authHeaders: Record<string, string> = {};

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get('OLLAMA_URL', 'http://localhost:11434');
    this.model = config.get('OLLAMA_MODEL', 'llama3.2');
    this.embedModel = config.get('OLLAMA_EMBED_MODEL', this.model);

    const clientId = this.config.get<string>('OLLAMA_CF_ACCESS_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('OLLAMA_CF_ACCESS_CLIENT_SECRET', '');
    if (clientId && clientSecret) {
      this.authHeaders['CF-Access-Client-Id'] = clientId;
      this.authHeaders['CF-Access-Client-Secret'] = clientSecret;
    }
  }

  getProviderName(): string {
    return 'ollama';
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const result = await this.generate(messages);
    return result.content;
  }

  async generate(messages: LLMMessage[]): Promise<LLMChatResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages,
        stream: false,
        options: { num_ctx: 4096 },
      }, { headers: this.authHeaders });
      const data = response.data || {};
      const content = data.message?.content || '';
      const prompt = data.prompt_eval_count || 0;
      const completion = data.eval_count || 0;
      return {
        content,
        usage: { prompt, completion, total: prompt + completion },
      };
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
        options: { num_ctx: 4096 },
      }, { headers: this.authHeaders, responseType: 'stream' });

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
      }, { headers: this.authHeaders });
      return response.data.embedding;
    } catch (error: any) {
      this.logger.error('Ollama embedding failed', error?.message);
      throw new Error('Embedding service unavailable');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { headers: this.authHeaders });
      return true;
    } catch {
      return false;
    }
  }
}
