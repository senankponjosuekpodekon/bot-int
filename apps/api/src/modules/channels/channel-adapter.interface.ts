export interface NormalizedMessage {
  visitorId: string;
  text: string;
  channel: string;
  metadata?: Record<string, any>;
}

export interface ChannelAdapter {
  readonly channel: string;
  normalize(tenantId: string, payload: any): Promise<NormalizedMessage | null>;
  getChallengeResponse?(query: Record<string, any>): string | null;
  verifySignature?(body: string, signature: string): boolean;
}
