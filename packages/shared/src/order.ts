export const orderStatuses = [
  'AWAITING_PAYMENT',
  'PAID',
  'IN_PRODUCTION',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const paymentMethods = ['PIX', 'BOLETO', 'CREDIT_CARD'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
