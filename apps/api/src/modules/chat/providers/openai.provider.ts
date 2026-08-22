import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LLMProvider, LLMMessage } from '../llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly embedModel: string;
  private readonly baseUrl: string;
  private readonly embedBaseUrl: string;
  private readonly embedApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('OPENAI_API_KEY', '');
    this.model = config.get('OPENAI_MODEL', 'gpt-4o-mini');
    this.embedModel = config.get('OPENAI_EMBED_MODEL', 'text-embedding-3-small');
    this.baseUrl = config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    this.embedBaseUrl = config.get('OPENAI_EMBED_BASE_URL', this.baseUrl);
    this.embedApiKey = config.get('OPENAI_EMBED_API_KEY', this.apiKey);
  }

  getProviderName(): string {
    return 'openai';
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.choices[0].message.content;
    } catch (error: any) {
      this.logger.error('OpenAI chat failed', error?.message);
      throw new Error('AI service unavailable');
    }
  }

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch { /* skip invalid JSON */ }
        }
      }
    } catch (error: any) {
      this.logger.error('OpenAI stream failed', error?.message);
      throw new Error('AI streaming unavailable');
    }
  }

  async embed(text: string, options?: { task?: string }): Promise<number[]> {
    try {
      const isJina = this.embedBaseUrl.includes('api.jina.ai');
      const payload = isJina
        ? {
            model: this.embedModel,
            task: options?.task ?? this.config.get('JINA_EMBED_TASK', 'retrieval.query'),
            normalized: this.config.get('JINA_EMBED_NORMALIZED', 'true') !== 'false',
            input: [{ text }],
          }
        : {
            model: this.embedModel,
            input: text,
          };

      const response = await axios.post(
        `${this.embedBaseUrl}/embeddings`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.embedApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.data[0].embedding;
    } catch (error: any) {
      this.logger.error('OpenAI embedding failed', error?.message);
      throw new Error('Embedding service unavailable');
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await axios.get(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
