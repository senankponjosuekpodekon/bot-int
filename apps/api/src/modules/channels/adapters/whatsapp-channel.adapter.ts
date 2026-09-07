import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ChannelAdapter, NormalizedMessage } from '../channel-adapter.interface';

export class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp';

  constructor(private readonly config?: ConfigService) {}

  async normalize(_tenantId: string, payload: any): Promise<NormalizedMessage | null> {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message || message.type !== 'text') {
      return null;
    }
    const text = message.text?.body;
    if (!text) return null;

    return {
      visitorId: String(message.from),
      text: String(text),
      channel: this.channel,
      metadata: {
        messageId: message.id,
        timestamp: message.timestamp,
        phoneNumberId: change?.metadata?.phone_number_id,
      },
    };
  }

  getChallengeResponse(query: Record<string, any>): string | null {
    if (query['hub.mode'] !== 'subscribe') return null;
    const token = this.config?.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    if (!token || query['hub.verify_token'] !== token) return null;
    return query['hub.challenge'] || 'ok';
  }

  verifySignature(body: string, signature: string): boolean {
    const secret = this.config?.get('WHATSAPP_WEBHOOK_SECRET');
    if (!secret) return true;
    if (!signature) return false;

    const expected = `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;
    if (signature.length !== expected.length) return false;
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
