export interface NormalizedMessage {
  visitorId: string;
  text: string;
  channel: string;
  metadata?: Record<string, any>;
}

export interface ChannelAdapter {
  readonly channel: string;
  normalize(tenantId: string, payload: any): Promise<NormalizedMessage | null>;
  // Optional: return every message contained in the payload (a webhook batch
  // may carry several). Falls back to [normalize()] when not implemented.
  normalizeAll?(tenantId: string, payload: any): Promise<NormalizedMessage[]>;
  getChallengeResponse?(query: Record<string, any>): string | null;
  verifySignature?(body: string, signature: string): boolean;
}
