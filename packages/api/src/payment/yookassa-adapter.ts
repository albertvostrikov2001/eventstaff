import { Buffer } from 'node:buffer';
import type { CreatePaymentParams, ExternalPaymentState, PaymentAdapter, PaymentResult } from '@/payment/payment-adapter';

const YK_API = 'https://api.yookassa.ru/v3';

function basicAuth(shopId: string, secretKey: string): string {
  const token = Buffer.from(`${shopId.trim()}:${secretKey.trim()}`).toString('base64');
  return `Basic ${token}`;
}

function mapStatus(s: string | undefined): ExternalPaymentState['status'] {
  switch (s) {
    case 'pending':
    case 'waiting_for_capture':
    case 'succeeded':
    case 'canceled':
      return s;
    default:
      return 'unknown';
  }
}

/**
 * YooKassa: https://yookassa.ru/developers
 * Never log request/response bodies in production; use provider id only in logs.
 */
export class YookassaAdapter implements PaymentAdapter {
  constructor(
    private readonly shopId: string,
    private readonly secretKey: string,
  ) {}

  private authHeader(): string {
    return basicAuth(this.shopId, this.secretKey);
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const value = params.amountRub.toFixed(2);
    const res = await fetch(`${YK_API}/payments`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Idempotence-Key': params.idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { value, currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: params.returnUrl },
        description: params.description.slice(0, 128),
        metadata: params.metadata,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`yookassa_create_${res.status}`);
    }
    const j = (await res.json()) as {
      id?: string;
      status?: string;
      confirmation?: { confirmation_url?: string; type?: string };
    };
    const id = j.id;
    const url = j.confirmation?.confirmation_url;
    if (!id || !url) {
      throw new Error('yookassa_invalid_response');
    }
    return { providerPaymentId: id, paymentUrl: url, rawStatus: j.status };
  }

  async getPayment(id: string): Promise<ExternalPaymentState> {
    const res = await fetch(`${YK_API}/payments/${id}`, {
      headers: { Authorization: this.authHeader() },
    });
    if (!res.ok) {
      throw new Error(`yookassa_get_${res.status}`);
    }
    const j = (await res.json()) as {
      status?: string;
      amount?: { value?: string };
      metadata?: Record<string, unknown>;
    };
    const v = j.amount?.value;
    const amountRub = v ? Math.round(parseFloat(v) * 100) / 100 : 0;
    return {
      status: mapStatus(j.status),
      amountRub,
      metadata: j.metadata,
    };
  }

  verifyWebhookRequest(secretFromQuery: string | undefined, configured: string | undefined): boolean {
    if (!configured?.trim()) {
      return true;
    }
    return secretFromQuery === configured.trim();
  }
}
