export type CreatePaymentParams = {
  amountRub: number;
  description: string;
  returnUrl: string;
  idempotenceKey: string;
  metadata: Record<string, string>;
};

export type PaymentResult = {
  providerPaymentId: string;
  paymentUrl: string;
  rawStatus?: string;
};

export type ExternalPaymentState = {
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled' | 'unknown';
  amountRub: number;
  metadata?: Record<string, unknown>;
};

export interface PaymentAdapter {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  getPayment(id: string): Promise<ExternalPaymentState>;
  /** e.g. query ?secret= — must match env when set */
  verifyWebhookRequest(secretFromQuery: string | undefined, configuredSecret: string | undefined): boolean;
}
