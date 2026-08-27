import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from './llm.service';
import { LLMMessage } from './llm-provider.interface';

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated' | 'angry';

export interface IntentDetectionResult {
  intent: string;
  confidence: number;
  language: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  sentiment: Sentiment;
  entities?: Record<string, string>;
}

export const KNOWN_INTENTS = [
  'quote',
  'appointment',
  'contact',
  'products',
  'support',
  'handoff',
  'greeting',
  'other',
];

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);

  constructor(private readonly llmService: LLMService) {}

  async detect(
    message: string,
    previousIntent?: string,
  ): Promise<IntentDetectionResult> {
    const prompt = `You are a customer service intent classifier. Return strictly JSON.

Allowed intents: quote, appointment, contact, products, support, handoff, greeting, other

Message: """${message}"""
${previousIntent ? `Previous intent in this conversation: ${previousIntent}` : ''}

Respond with valid JSON only (no markdown, no explanation):
{
  "intent": "quote",
  "confidence": 0.92,
  "language": "fr",
  "needsClarification": false,
  "clarificationQuestion": "",
  "sentiment": "neutral",
  "entities": {}
}

Rules:
- intent must be one of the allowed values.
- confidence is a float between 0.0 and 1.0.
- language is an ISO 639-1 code (e.g. en, fr, es, de).
- needsClarification is true only if the message is ambiguous between two or more valid intents.
- clarificationQuestion is in the same language as the user.
- sentiment is one of: positive, neutral, negative, frustrated, angry.
- entities can include: email, phone, name, product, quantity, date, budget.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Classify the message.' },
    ];

    try {
      const raw = await this.llmService.chat(messages);
      const json = this.extractJson(raw);
      const parsed = JSON.parse(json);
      return this.normalize(parsed, message);
    } catch (err: any) {
      this.logger.warn(`LLM intent detection failed: ${err?.message}`);
      return this.fallback(message);
    }
  }

  private extractJson(raw: string): string {
    const match = raw.match(/\{[\s\S]*?\}/);
    return match ? match[0] : raw;
  }

  private normalize(parsed: any, original: string): IntentDetectionResult {
    let intent = String(parsed?.intent || 'other').toLowerCase().trim();
    const langMatch = String(parsed?.language || 'fr')
      .toLowerCase()
      .match(/^[a-z]{2}/);
    let language = langMatch ? langMatch[0] : this.fallbackLanguage(original);

    if (!KNOWN_INTENTS.includes(intent)) {
      intent = this.mapLooseIntent(intent, original);
    }

    const confidence = Math.max(
      0,
      Math.min(1, Number(parsed?.confidence) || 0),
    );
    const needsClarification =
      Boolean(parsed?.needsClarification) && confidence < 0.7;
    const clarificationQuestion = String(parsed?.clarificationQuestion || '');
    const entities =
      parsed && typeof parsed.entities === 'object' && parsed.entities !== null
        ? parsed.entities
        : {};
    const sentiment = this.normalizeSentiment(parsed?.sentiment);

    return {
      intent,
      confidence,
      language,
      needsClarification,
      clarificationQuestion: needsClarification ? clarificationQuestion : undefined,
      sentiment,
      entities,
    };
  }

  private normalizeSentiment(raw: any): Sentiment {
    const value = String(raw || 'neutral').toLowerCase().trim();
    const allowed: Sentiment[] = ['positive', 'neutral', 'negative', 'frustrated', 'angry'];
    if (allowed.includes(value as Sentiment)) return value as Sentiment;

    if (/furi|angry|mad|rage|hate|insult/.test(value)) return 'angry';
    if (/frustrat|annoy|upset|irritat|impatient|disappoint/.test(value)) return 'frustrated';
    if (/bad|negative|sad|unhappy|poor|terrible|awful/.test(value)) return 'negative';
    if (/good|positive|happy|great|excellent|love|merci/.test(value)) return 'positive';
    return 'neutral';
  }

  private mapLooseIntent(intent: string, original: string): string {
    const mapped =
      /devis|quote|estimation|prix|tarif|co[uû]te|combien|budget/.test(intent) ? 'quote' :
      /rendez-vous|rdv|appointment|meeting|consultation|d[eé]mo/.test(intent) ? 'appointment' :
      /contact|coordonn[eé]e|t[eé]l[eé]phone|email|joindre/.test(intent) ? 'contact' :
      /produit|product|service|catalog|offre|disponible/.test(intent) ? 'products' :
      /support|help|aide|probl[eè]me|bug/.test(intent) ? 'support' :
      /human|humain|op[eé]rateur|agent/.test(intent) ? 'handoff' :
      /bonjour|salut|hello|hi|hey/.test(intent) ? 'greeting' : 'other';
    return mapped;
  }

  private fallbackLanguage(message: string): string {
    // Basic hint: French is the default. Short French words suggest fr.
    const lower = message.toLowerCase();
    if (/(^|\s)bonjour|salut|comment|merci|je suis|je veux|devis|prix/.test(lower)) return 'fr';
    if (/(^|\s)hello|hi\b|how much|what is|i want|quote|price/.test(lower)) return 'en';
    return 'fr';
  }

  private fallback(message: string): IntentDetectionResult {
    const lower = message.toLowerCase();
    if (/devis|quote|estimation|prix|tarif|co[uû]te|combien/.test(lower)) {
      return { intent: 'quote', confidence: 0.5, language: 'fr', needsClarification: false, sentiment: 'neutral' };
    }
    if (/rendez-vous|rdv|appointment|meeting|consultation/.test(lower)) {
      return { intent: 'appointment', confidence: 0.5, language: 'fr', needsClarification: false, sentiment: 'neutral' };
    }
    if (/contact|coordonn[eé]e|t[eé]l[eé]phone|email|joindre/.test(lower)) {
      return { intent: 'contact', confidence: 0.5, language: 'fr', needsClarification: false, sentiment: 'neutral' };
    }
    if (/produit|service|catalogue|offre|disponible/.test(lower)) {
      return { intent: 'products', confidence: 0.5, language: 'fr', needsClarification: false, sentiment: 'neutral' };
    }
    if (/bonjour|salut|hello|hi|hey/.test(lower)) {
      return { intent: 'greeting', confidence: 0.5, language: 'fr', needsClarification: false, sentiment: 'neutral' };
    }
    if (/humain|op[eé]rateur|human|agent/.test(lower)) {
      return { intent: 'handoff', confidence: 0.5, language: 'fr', needsClarification: false, sentiment: 'neutral' };
    }
    if (/probl[eè]me|aide|help|support|bug/.test(lower)) {
      return { intent: 'support', confidence: 0.5, language: 'fr', needsClarification: false, sentiment: 'neutral' };
    }
    return { intent: 'other', confidence: 0.3, language: 'fr', needsClarification: false, sentiment: 'neutral' };
  }
}
