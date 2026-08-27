import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from '../channels/channel-adapter.interface';
import { MediaParserService } from './media-parser.service';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  readonly channel = 'telegram';

  constructor(private readonly mediaParserService: MediaParserService) {}

  async normalize(tenantId: string, payload: any): Promise<NormalizedMessage | null> {
    const message = payload?.message;
    if (!message) return null;

    const from = message.from?.id?.toString() || 'unknown';
    let text = message.text || '';

    if (!text) {
      const type = message.document
        ? 'document'
        : message.photo
        ? 'image'
        : message.voice
        ? 'audio'
        : message.video
        ? 'video'
        : 'media';
      text = await this.mediaParserService.parseMedia(tenantId, this.channel, {
        type,
        caption: message.caption,
      });
    }

    if (!text) return null;

    return {
      visitorId: `${this.channel}_${from}`,
      text,
      channel: this.channel,
      metadata: { telegramMessageId: message.message_id, from },
    };
  }
}
