import { createHmac, timingSafeEqual } from 'node:crypto';
import { pixPrice } from '@crealio/shared';
import type { PaymentMethod, PaymentStatus } from '../generated/prisma/enums.js';

// Status do pagamento no Mercado Pago → status no nosso banco.
// https://www.mercadopago.com.br/developers/pt/reference/payments/_payments_id/get
export function mapStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
    case 'cancelled':
      return 'REJECTED';
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED';
    default:
      // pending, in_process, authorized, in_mediation
      return 'PENDING';
  }
}

// payment_type_id → forma de pagamento. No Brasil o Pix chega como bank_transfer.
export function mapMethod(paymentType: string): PaymentMethod {
  if (paymentType === 'bank_transfer') return 'PIX';
  if (paymentType === 'ticket') return 'BOLETO';
  if (paymentType === 'account_money') return 'ACCOUNT_MONEY';
  return 'CREDIT_CARD';
}

// Tipos que a preferência "Pix" aceita, e portanto pagam o preço com desconto.
// O saldo da conta entra porque o Mercado Pago não deixa excluí-lo
// ("account_money cannot be excluded").
export const PIX_PREFERENCE_TYPES = ['bank_transfer', 'account_money'];

// O valor pago tem de bater com o pedido: cheio em qualquer forma, ou com o
// desconto do Pix nos tipos da preferência Pix. Sem isso, uma preferência
// montada com outro preço (ou um bug) quitaria um pedido pago a menos.
export function amountMatches(orderTotal: number, paymentType: string, paid: number): boolean {
  const cents = (value: number) => Math.round(value * 100);
  if (cents(paid) === cents(orderTotal)) return true;
  return PIX_PREFERENCE_TYPES.includes(paymentType) && cents(paid) === cents(pixPrice(orderTotal));
}

// Assinatura do webhook (header x-signature: "ts=...,v1=<hmac>"). O manifest é
// "id:<data.id minúsculo>;request-id:<x-request-id>;ts:<ts>;", omitindo o que
// não vier na notificação. Documentação: Webhooks > Validar origem.
export function verifyWebhookSignature(input: {
  secret: string;
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
}): boolean {
  if (!input.xSignature) return false;
  const parts = Object.fromEntries(
    input.xSignature.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    }),
  );
  const { ts, v1 } = parts as { ts?: string; v1?: string };
  if (!ts || !v1) return false;

  const manifest =
    (input.dataId ? `id:${input.dataId.toLowerCase()};` : '') +
    (input.xRequestId ? `request-id:${input.xRequestId};` : '') +
    `ts:${ts};`;
  const expected = createHmac('sha256', input.secret).update(manifest).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
