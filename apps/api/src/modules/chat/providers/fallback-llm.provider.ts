import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMMessage, LLMChatResult } from '../llm-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { OllamaProvider } from './ollama.provider';
import { MetricsService } from '../../../common/metrics.service';

interface BreakerState {
  failures: number;
  openedAt: number;
}

// Wraps a primary/fallback provider pair with:
//  - a circuit breaker: after LLM_BREAKER_THRESHOLD consecutive failures the
//    primary is skipped entirely for LLM_BREAKER_COOLDOWN_MS (half-open after
//    that — one probe request decides whether it closes again);
//  - a health-check cache so we don't hit /models on every request;
//  - Prometheus metrics for request counts, latency, and breaker state.
@Injectable()
export class FallbackLLMProvider implements LLMProvider {
  private readonly logger = new Logger(FallbackLLMProvider.name);
  private readonly primary: LLMProvider;
  private readonly fallback: LLMProvider;
  private readonly breakerThreshold: number;
  private readonly breakerCooldownMs: number;
  private readonly healthCacheMs: number;
  private readonly breakers = new Map<string, BreakerState>();
  private readonly healthCache = new Map<string, { ok: boolean; checkedAt: number }>();

  constructor(
    private readonly config: ConfigService,
    private readonly openai: OpenAIProvider,
    private readonly ollama: OllamaProvider,
    private readonly metrics: MetricsService,
  ) {
    this.breakerThreshold = Number(config.get('LLM_BREAKER_THRESHOLD', 3));
    this.breakerCooldownMs = Number(config.get('LLM_BREAKER_COOLDOWN_MS', 60000));
    this.healthCacheMs = Number(config.get('LLM_HEALTH_CACHE_MS', 30000));
    const provider = this.config.get<string>('LLM_PROVIDER', 'openai');
    if (provider === 'ollama') {
      this.primary = this.ollama;
      this.fallback = this.openai;
    } else {
      this.primary = this.openai;
      this.fallback = this.ollama;
    }
  }

  getProviderName(): string {
    return 'fallback';
  }

  private isCircuitOpen(provider: LLMProvider): boolean {
    const state = this.breakers.get(provider.getProviderName());
    if (!state || state.failures < this.breakerThreshold) return false;
    if (Date.now() - state.openedAt >= this.breakerCooldownMs) return false; // half-open probe
    return true;
  }

  private recordSuccess(provider: LLMProvider): void {
    this.breakers.delete(provider.getProviderName());
  }

  private recordFailure(provider: LLMProvider): void {
    const name = provider.getProviderName();
    const state = this.breakers.get(name) || { failures: 0, openedAt: 0 };
    state.failures += 1;
    if (state.failures >= this.breakerThreshold) state.openedAt = Date.now();
    this.breakers.set(name, state);
    this.metrics.setGauge('llm_breaker_open', this.isCircuitOpen(provider) ? 1 : 0, { provider: name });
  }

  private async isHealthy(provider: LLMProvider): Promise<boolean> {
    if (this.isCircuitOpen(provider)) return false;
    const name = provider.getProviderName();
    const cached = this.healthCache.get(name);
    if (cached && Date.now() - cached.checkedAt < this.healthCacheMs) return cached.ok;
    const ok = await provider.isAvailable().catch(() => false);
    this.healthCache.set(name, { ok, checkedAt: Date.now() });
    return ok;
  }

  private async run<T>(op: string, fn: (p: LLMProvider) => Promise<T>): Promise<T> {
    const start = Date.now();
    const usePrimary = await this.isHealthy(this.primary);
    const provider = usePrimary ? this.primary : this.fallback;
    try {
      const result = await fn(provider);
      this.recordSuccess(provider);
      this.metrics.observeDuration('llm_request_duration_ms', Date.now() - start, { op, provider: provider.getProviderName() });
      this.metrics.incCounter('llm_requests_total', { op, provider: provider.getProviderName(), result: 'success' });
      return result;
    } catch (err: any) {
      this.recordFailure(provider);
      this.metrics.incCounter('llm_requests_total', { op, provider: provider.getProviderName(), result: 'error' });
      if (provider === this.primary) {
        this.logger.warn(`${this.primary.getProviderName()} ${op} failed, falling back to ${this.fallback.getProviderName()}: ${err.message}`);
        try {
          const result = await fn(this.fallback);
          this.recordSuccess(this.fallback);
          this.metrics.incCounter('llm_requests_total', { op, provider: this.fallback.getProviderName(), result: 'success' });
          return result;
        } catch (fallbackErr: any) {
          this.recordFailure(this.fallback);
          this.metrics.incCounter('llm_requests_total', { op, provider: this.fallback.getProviderName(), result: 'error' });
          throw fallbackErr;
        }
      }
      throw err;
    }
  }

  async isAvailable(): Promise<boolean> {
    const primaryOk = await this.isHealthy(this.primary);
    const fallbackOk = await this.isHealthy(this.fallback);
    return primaryOk || fallbackOk;
  }

  chat(messages: LLMMessage[]): Promise<string> {
    return this.run('chat', (p) => p.chat(messages));
  }

  generate(messages: LLMMessage[]): Promise<LLMChatResult> {
    return this.run('generate', (p) => p.generate(messages));
  }

  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    const usePrimary = await this.isHealthy(this.primary);
    const provider = usePrimary ? this.primary : this.fallback;
    let gen = provider.chatStream(messages);
    let first: IteratorResult<string, any>;
    try {
      first = await gen.next();
      this.recordSuccess(provider);
    } catch (err: any) {
      this.recordFailure(provider);
      this.metrics.incCounter('llm_requests_total', { op: 'stream', provider: provider.getProviderName(), result: 'error' });
      if (provider === this.primary) {
        this.logger.warn(
          `${this.primary.getProviderName()} stream start failed, falling back to ${this.fallback.getProviderName()}: ${err.message}`,
        );
        gen = this.fallback.chatStream(messages);
        first = await gen.next();
      } else {
        throw err;
      }
    }
    this.metrics.incCounter('llm_requests_total', { op: 'stream', provider: provider.getProviderName(), result: 'success' });
    if (!first.done) {
      yield first.value as string;
    }
    for await (const chunk of gen) {
      yield chunk;
    }
  }

  embed(text: string, options?: { task?: string }): Promise<number[]> {
    return this.run('embed', (p) => p.embed(text, options));
  }
}
