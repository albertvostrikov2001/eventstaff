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
 * Настройки фискализации (54-ФЗ). vatCode — код ставки НДС по справочнику ЮKassa:
 * 1 — без НДС, 2 — 0%, 3 — 10%, 4 — 20%, 5 — 10/110, 6 — 20/120.
 */
export type FiscalizationConfig = {
  vatCode: number;
  /** Признак предмета расчёта, по умолчанию 'service' (услуга). */
  paymentSubject?: string;
  /** Признак способа расчёта, по умолчанию 'full_payment' (полный расчёт). */
  paymentMode?: string;
};

/** Адаптер с фискализацией, если YOOKASSA_SEND_RECEIPT=true. */
export function fiscalizationFromEnv(): FiscalizationConfig | null {
  if (process.env.YOOKASSA_SEND_RECEIPT?.trim() !== 'true') return null;
  const parsed = parseInt(process.env.YOOKASSA_VAT_CODE?.trim() || '1', 10);
  return { vatCode: Number.isFinite(parsed) ? parsed : 1 };
}

/** Собирает адаптер из env (shopId + secretKey + фискализация) или null. */
export function yookassaFromEnv(): YookassaAdapter | null {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim() ?? '';
  const key = process.env.YOOKASSA_SECRET_KEY?.trim() ?? '';
  if (!shopId || !key) return null;
  return new YookassaAdapter(shopId, key, fiscalizationFromEnv());
}

/**
 * YooKassa: https://yookassa.ru/developers
 * Never log request/response bodies in production; use provider id only in logs.
 */
export class YookassaAdapter implements PaymentAdapter {
  constructor(
    private readonly shopId: string,
    private readonly secretKey: string,
    private readonly fiscalization: FiscalizationConfig | null = null,
  ) {}

  private authHeader(): string {
    return basicAuth(this.shopId, this.secretKey);
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const value = params.amountRub.toFixed(2);
    const body: Record<string, unknown> = {
      amount: { value, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      description: params.description.slice(0, 128),
      metadata: params.metadata,
    };

    // Фискальный чек (54-ФЗ): требуется, когда в ЮKassa включены «Чеки».
    if (this.fiscalization && params.customerEmail) {
      body.receipt = {
        customer: { email: params.customerEmail },
        items: [
          {
            description: params.description.slice(0, 128),
            quantity: '1.00',
            amount: { value, currency: 'RUB' },
            vat_code: this.fiscalization.vatCode,
            payment_subject: this.fiscalization.paymentSubject ?? 'service',
            payment_mode: this.fiscalization.paymentMode ?? 'full_payment',
          },
        ],
      };
    }

    const res = await fetch(`${YK_API}/payments`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Idempotence-Key': params.idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`yookassa_create_${res.status}: ${t.slice(0, 200)}`);
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
