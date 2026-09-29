import { Injectable } from '@nestjs/common';

interface Sample {
  count: number;
  sum: number;
  max: number;
}

// In-memory Prometheus-style metrics. Process-local by design (fine for a
// single replica); for multi-instance deploys scrape every pod or move to a
// push gateway.
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly durations = new Map<string, Sample>();

  private static key(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const l = Object.keys(labels)
      .sort()
      .map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`)
      .join(',');
    return `${name}{${l}}`;
  }

  incCounter(name: string, labels?: Record<string, string>, by = 1): void {
    const k = MetricsService.key(name, labels);
    this.counters.set(k, (this.counters.get(k) || 0) + by);
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(MetricsService.key(name, labels), value);
  }

  observeDuration(name: string, ms: number, labels?: Record<string, string>): void {
    const k = MetricsService.key(name, labels);
    const s = this.durations.get(k) || { count: 0, sum: 0, max: 0 };
    s.count += 1;
    s.sum += ms;
    s.max = Math.max(s.max, ms);
    this.durations.set(k, s);
  }

  render(): string {
    const lines: string[] = [];
    for (const [k, v] of this.counters) lines.push(`${k} ${v}`);
    for (const [k, v] of this.gauges) lines.push(`${k} ${v}`);
    for (const [k, s] of this.durations) {
      lines.push(`${k}_count ${s.count}`);
      lines.push(`${k}_sum ${Math.round(s.sum)}`);
      lines.push(`${k}_max ${Math.round(s.max)}`);
    }
    return lines.join('\n') + '\n';
  }
}
