export interface NormalizedMessage {
  visitorId: string;
  text: string;
  channel: string;
  metadata?: Record<string, any>;
}

export interface ChannelAdapter {
  readonly channel: string;
  normalize(tenantId: string, payload: any): Promise<NormalizedMessage | null>;
}
