import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from '../channels/channel-adapter.interface';

@Injectable()
export class InstagramAdapter implements ChannelAdapter {
  readonly channel = 'instagram';

  async normalize(tenantId: string, payload: any): Promise<NormalizedMessage | null> {
    const all = await this.normalizeAll(tenantId, payload);
    return all[0] || null;
  }

  async normalizeAll(_tenantId: string, payload: any): Promise<NormalizedMessage[]> {
    const messages: NormalizedMessage[] = [];

    for (const entry of payload?.entry || []) {
      for (const event of entry?.messaging || []) {
        const msg = event?.message;
        if (!msg || msg.is_echo) continue;
        let text = msg.text;
        if (!text && msg.attachments?.length) {
          const kind = msg.attachments[0]?.type || 'media';
          text = `[Pièce jointe ${kind} reçue via Instagram]`;
        }
        if (!text) continue;
        messages.push({
          visitorId: `instagram_${event.sender?.id}`,
          text: String(text),
          channel: this.channel,
          metadata: { instagramMessageId: msg.mid, from: event.sender?.id },
        });
      }
    }

    return messages;
  }
}
