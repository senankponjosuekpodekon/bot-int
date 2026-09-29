import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Cloudflare Turnstile verification. Enabled only when TURNSTILE_SECRET_KEY is
// set; otherwise verification is a no-op so local dev stays unblocked.
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secret?: string;

  constructor(private readonly config: ConfigService) {
    this.secret = config.get<string>('TURNSTILE_SECRET_KEY') || undefined;
    if (this.secret) {
      this.logger.log('Turnstile verification enabled for public endpoints');
    }
  }

  get enabled(): boolean {
    return !!this.secret;
  }

  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    if (!this.secret) return;
    if (!token) {
      throw new UnauthorizedException('Bot verification required');
    }
    try {
      const { data } = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { secret: this.secret, response: token, remoteip: remoteIp },
        { timeout: 5000 },
      );
      if (!data?.success) {
        this.logger.warn(`Turnstile rejected: ${(data?.['error-codes'] || []).join(',') || 'unknown'}`);
        throw new UnauthorizedException('Bot verification failed');
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      // Fail closed on verifier outages to avoid opening a spam window.
      this.logger.error(`Turnstile siteverify error: ${e.message}`);
      throw new UnauthorizedException('Bot verification unavailable');
    }
  }
}
