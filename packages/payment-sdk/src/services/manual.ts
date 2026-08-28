import { PaymentEnvironment } from '../types';

export interface ManualPaymentRecord {
  id: string;
  provider: 'manual';
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  reference: string;
  metadata?: Record<string, string>;
  createdAt: string;
  paidAt?: string;
}

export interface ManualPaymentPayload {
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  reference?: string;
  metadata?: Record<string, string>;
}

export interface ManualPaymentConfig {
  environment: PaymentEnvironment;
}

function generateReference() {
  return 'MANUAL_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class ManualPaymentService {
  private config: ManualPaymentConfig;
  private payments: Map<string, ManualPaymentRecord> = new Map();

  constructor(config: ManualPaymentConfig) {
    this.config = config;
  }

  async createPayment(payload: ManualPaymentPayload): Promise<ManualPaymentRecord> {
    const record: ManualPaymentRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'manual_' + Date.now(),
      provider: 'manual',
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description,
      customerEmail: payload.customerEmail,
      customerName: payload.customerName,
      status: 'pending',
      reference: payload.reference || generateReference(),
      metadata: payload.metadata,
      createdAt: new Date().toISOString(),
    };
    this.payments.set(record.id, record);
    return record;
  }

  async confirmPayment(id: string): Promise<ManualPaymentRecord | undefined> {
    const record = this.payments.get(id);
    if (!record) return undefined;
    record.status = 'paid';
    record.paidAt = new Date().toISOString();
    this.payments.set(id, record);
    return record;
  }

  async getPayment(id: string): Promise<ManualPaymentRecord | undefined> {
    return this.payments.get(id);
  }

  async listPayments(): Promise<ManualPaymentRecord[]> {
    return Array.from(this.payments.values());
  }
}
