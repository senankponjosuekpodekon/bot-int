import { BadRequestException } from '@nestjs/common';
import { ChannelAdapter, NormalizedMessage } from '../channel-adapter.interface';

export class WidgetChannelAdapter implements ChannelAdapter {
  readonly channel = 'web';

  async normalize(_tenantId: string, payload: any): Promise<NormalizedMessage | null> {
    if (!payload?.visitorId || !payload?.text) {
      throw new BadRequestException('Widget payload must include visitorId and text');
    }
    return {
      visitorId: String(payload.visitorId),
      text: String(payload.text),
      channel: this.channel,
      metadata: payload.metadata || {},
    };
  }
}
