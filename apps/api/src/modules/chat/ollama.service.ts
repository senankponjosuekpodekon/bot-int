import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get('OLLAMA_URL', 'http://localhost:11434');
    this.model = config.get('OLLAMA_MODEL', 'llama3.2');
  }

  async chat(messages: OllamaMessage[]): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages,
        stream: false,
      });
      return response.data.message.content;
    } catch (error: any) {
      this.logger.error('Ollama request failed', error?.message);
      throw new Error('AI service unavailable');
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: this.model,
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
