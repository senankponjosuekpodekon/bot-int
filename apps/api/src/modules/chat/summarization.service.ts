import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from './llm.service';
import { LLMMessage } from './llm-provider.interface';
import { Message } from './message.entity';

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(private readonly llmService: LLMService) {}

  async summarize(messages: Message[], language = 'fr'): Promise<string> {
    const text = messages
      .map((m) => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are a conversation summarizer. Summarize the following customer service conversation in a few concise bullet points. Preserve the user's needs, preferences, and any facts they mentioned. Respond in ${language === 'en' ? 'English' : 'French'}.

${text}

Summary:`;

    const msgs: LLMMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Summarize the conversation.' },
    ];

    try {
      const raw = await this.llmService.chat(msgs);
      return raw.trim().slice(0, 2000);
    } catch (err: any) {
      this.logger.warn(`Summarization failed: ${err?.message}`);
      return language === 'en' ? 'Previous context unavailable' : 'Résumé des échanges précédents non disponible';
    }
  }
}
