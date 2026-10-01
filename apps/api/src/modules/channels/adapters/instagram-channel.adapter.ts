import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ChannelAdapter, NormalizedMessage } from '../channel-adapter.interface';

export class InstagramChannelAdapter implements ChannelAdapter {
  readonly channel = 'instagram';

  constructor(private readonly config?: ConfigService) {}

  async normalize(tenantId: string, payload: any): Promise<NormalizedMessage | null> {
    const all = await this.normalizeAll(tenantId, payload);
    return all[0] || null;
  }

  async normalizeAll(_tenantId: string, payload: any): Promise<NormalizedMessage[]> {
    const messages: NormalizedMessage[] = [];
    for (const entry of payload?.entry || []) {
      for (const event of entry?.messaging || []) {
        if (!event?.message?.text) continue;
        messages.push({
          visitorId: String(event.sender.id),
          text: String(event.message.text),
          channel: this.channel,
          metadata: {
            messageId: event.message.mid,
            timestamp: event.timestamp,
          },
        });
      }
    }
    return messages;
  }

  getChallengeResponse(query: Record<string, any>): string | null {
    if (query['hub.mode'] !== 'subscribe') return null;
    const token = this.config?.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN');
    if (!token || query['hub.verify_token'] !== token) return null;
    return query['hub.challenge'] || 'ok';
  }

  verifySignature(body: string, signature: string): boolean {
    const secret = this.config?.get('INSTAGRAM_WEBHOOK_SECRET');
    if (!secret) return false;
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
