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

  // Adds hostnames to the Turnstile widget's domain list via the Cloudflare
  // API so newly registered customer domains keep passing the challenge.
  // No-op unless CF_API_TOKEN and CF_ACCOUNT_ID are set; never throws.
  async syncDomainsToWidget(hostnames: string[]): Promise<void> {
    const token = this.config.get<string>('CF_API_TOKEN');
    const accountId = this.config.get<string>('CF_ACCOUNT_ID');
    const widgetId =
      this.config.get<string>('TURNSTILE_WIDGET_ID') ||
      this.config.get<string>('TURNSTILE_SITE_KEY');
    if (!token || !accountId || !widgetId || !hostnames?.length) return;
    const wanted = [
      ...new Set(
        hostnames
          .map((h) => h.trim().toLowerCase().replace(/^\*\./, ''))
          .filter((h) => h && h !== '*'),
      ),
    ];
    if (!wanted.length) return;
    try {
      const api = axios.create({
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/challenges/widgets`,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      const { data } = await api.get(`/${widgetId}`);
      const current: string[] = data?.result?.domains || [];
      const merged = [...new Set([...current, ...wanted])];
      if (merged.length === current.length) return;
      // Never remove: another tenant may still embed on an old domain.
      await api.put(`/${widgetId}`, { domains: merged });
      this.logger.log(`Turnstile widget domains synced (+${merged.length - current.length}): ${wanted.join(', ')}`);
    } catch (e) {
      this.logger.error(`Turnstile domain sync failed: ${e.message}`);
    }
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
