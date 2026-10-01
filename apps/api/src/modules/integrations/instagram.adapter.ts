import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from '../channels/channel-adapter.interface';

@Injectable()
export class InstagramAdapter implements ChannelAdapter {
  readonly channel = 'instagram';

  async normalize(_tenantId: string, payload: any): Promise<NormalizedMessage | null> {
    const messages: NormalizedMessage[] = [];

    for (const entry of payload?.entry || []) {
      for (const event of entry?.messaging || []) {
        const msg = event?.message;
        if (!msg || msg.is_echo) continue;
        const text = msg.text;
        if (!text) continue;
        messages.push({
          visitorId: `instagram_${event.sender?.id}`,
          text: String(text),
          channel: this.channel,
          metadata: { instagramMessageId: msg.mid, from: event.sender?.id },
        });
      }
    }

    return messages[0] || null;
  }
}
