import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from '../channels/channel-adapter.interface';
import { MediaParserService } from './media-parser.service';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp';

  constructor(private readonly mediaParserService: MediaParserService) {}

  async normalize(tenantId: string, payload: any): Promise<NormalizedMessage | null> {
    const entries = payload?.entry || [];
    const messages: NormalizedMessage[] = [];

    for (const entry of entries) {
      for (const change of entry?.changes || []) {
        for (const msg of change?.value?.messages || []) {
          const from = msg.from;
          const type = msg.type;
          let text = msg.text?.body || '';

          if (!text && type && type !== 'text') {
            text = await this.mediaParserService.parseMedia(tenantId, this.channel, {
              type,
              id: msg[type]?.id,
              filename: msg[type]?.filename,
              mime: msg[type]?.mime_type,
              caption: msg[type]?.caption,
            });
          }

          if (text) {
            messages.push({
              visitorId: `${this.channel}_${from}`,
              text,
              channel: this.channel,
              metadata: { whatsappMessageId: msg.id, from },
            });
          }
        }
      }
    }

    return messages[0] || null;
  }
}
