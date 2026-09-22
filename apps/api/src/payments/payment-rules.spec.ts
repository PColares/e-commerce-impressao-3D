import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { amountMatches, mapMethod, mapStatus, verifyWebhookSignature } from './payment-rules.js';

describe('mapStatus', () => {
  it('traduz os status do Mercado Pago para os do pedido', () => {
    expect(mapStatus('approved')).toBe('APPROVED');
    expect(mapStatus('pending')).toBe('PENDING');
    expect(mapStatus('in_process')).toBe('PENDING');
    expect(mapStatus('authorized')).toBe('PENDING');
    expect(mapStatus('rejected')).toBe('REJECTED');
    expect(mapStatus('cancelled')).toBe('REJECTED');
    expect(mapStatus('refunded')).toBe('REFUNDED');
    expect(mapStatus('charged_back')).toBe('REFUNDED');
  });
});

describe('mapMethod', () => {
  it('Pix chega como bank_transfer, boleto como ticket', () => {
    expect(mapMethod('bank_transfer')).toBe('PIX');
    expect(mapMethod('ticket')).toBe('BOLETO');
    expect(mapMethod('credit_card')).toBe('CREDIT_CARD');
    expect(mapMethod('debit_card')).toBe('CREDIT_CARD');
    expect(mapMethod('account_money')).toBe('ACCOUNT_MONEY');
  });
});

describe('amountMatches', () => {
  it('aceita o valor cheio em qualquer forma de pagamento', () => {
    expect(amountMatches(174, 'credit_card', 174)).toBe(true);
    expect(amountMatches(174, 'bank_transfer', 174)).toBe(true);
  });

  it('aceita o valor com desconto no Pix e no saldo Mercado Pago (a preferência do Pix não pode excluir o saldo)', () => {
    expect(amountMatches(174, 'bank_transfer', 156.6)).toBe(true);
    expect(amountMatches(174, 'account_money', 156.6)).toBe(true);
    expect(amountMatches(174, 'credit_card', 156.6)).toBe(false);
    expect(amountMatches(174, 'ticket', 156.6)).toBe(false);
  });

  it('recusa qualquer outro valor (ex.: preço adulterado na preferência)', () => {
    expect(amountMatches(174, 'bank_transfer', 1)).toBe(false);
    expect(amountMatches(174, 'credit_card', 173.99)).toBe(false);
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'segredo-do-webhook';
  const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex');

  it('aceita a assinatura calculada pelo manifest da documentação', () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1704908010;');

    expect(
      verifyWebhookSignature({
        secret,
        xSignature: `ts=1704908010,v1=${v1}`,
        xRequestId: 'req-1',
        dataId: '123456',
      }),
    ).toBe(true);
  });

  it('usa o data.id em minúsculas e omite partes ausentes do manifest', () => {
    const v1 = sign('id:ord01abc;ts:1704908010;');

    expect(
      verifyWebhookSignature({ secret, xSignature: `ts=1704908010,v1=${v1}`, dataId: 'ORD01ABC' }),
    ).toBe(true);
  });

  it('recusa assinatura errada, adulterada ou ausente', () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1704908010;');
    const base = { secret, xRequestId: 'req-1', dataId: '123456' };

    expect(verifyWebhookSignature({ ...base, xSignature: `ts=1704908010,v1=${'0'.repeat(64)}` })).toBe(false);
    expect(verifyWebhookSignature({ ...base, dataId: '999', xSignature: `ts=1704908010,v1=${v1}` })).toBe(false);
    expect(verifyWebhookSignature({ ...base, xSignature: undefined })).toBe(false);
  });
});
