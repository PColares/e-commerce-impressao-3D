import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PaymentsService, type PaymentsConfig } from './payments.service.js';
import type { MercadoPagoGateway, MpPayment } from './mercadopago.gateway.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const ORDER = {
  id: 'ord1',
  userId: 'u1',
  status: 'AWAITING_PAYMENT',
  totalPrice: '174',
  quote: { fileName: 'suporte.stl' },
};

function mpPayment(overrides: Partial<MpPayment> = {}): MpPayment {
  return {
    id: 9001,
    status: 'approved',
    payment_type_id: 'credit_card',
    transaction_amount: 174,
    external_reference: 'ord1',
    date_last_updated: '2026-09-22T12:00:00.000-04:00',
    ...overrides,
  };
}

function setup(config: Partial<PaymentsConfig> = {}) {
  const prisma = {
    order: { findFirst: vi.fn().mockResolvedValue(ORDER), findUnique: vi.fn().mockResolvedValue(ORDER), update: vi.fn() },
    payment: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  const gateway = {
    createPreference: vi.fn().mockResolvedValue({ id: 'pref1', init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref1' }),
    getPayment: vi.fn().mockResolvedValue(mpPayment()),
    searchPayments: vi.fn().mockResolvedValue([]),
  };
  const service = new PaymentsService(prisma as unknown as PrismaService, gateway as unknown as MercadoPagoGateway, {
    accessToken: 'APP_USR-teste',
    appUrl: 'https://violet-tapir-602845.hostingersite.com',
    ...config,
  });
  return { prisma, gateway, service };
}

describe('PaymentsService', () => {
  describe('checkout', () => {
    it('Pix: cobra o valor com desconto e só oferece Pix', async () => {
      const { gateway, service } = setup();

      const result = await service.checkout('u1', 'ord1', 'pix');

      const body = gateway.createPreference.mock.calls[0]![0];
      expect(body.items[0]).toMatchObject({ unit_price: 156.6, quantity: 1, currency_id: 'BRL' });
      expect(body.external_reference).toBe('ord1');
      expect(body.payment_methods.excluded_payment_types.map((t: { id: string }) => t.id)).not.toContain(
        'bank_transfer',
      );
      expect(body.payment_methods.excluded_payment_types.map((t: { id: string }) => t.id)).toContain('credit_card');
      // O Mercado Pago recusa a preferência se o saldo da conta for excluído.
      expect(body.payment_methods.excluded_payment_types.map((t: { id: string }) => t.id)).not.toContain(
        'account_money',
      );
      expect(result.checkoutUrl).toContain('pref_id=pref1');
    });

    it('cartão ou boleto: valor cheio, sem Pix, até 10x', async () => {
      const { gateway, service } = setup();

      await service.checkout('u1', 'ord1', 'card');

      const body = gateway.createPreference.mock.calls[0]![0];
      expect(body.items[0].unit_price).toBe(174);
      expect(body.payment_methods.excluded_payment_types).toEqual([{ id: 'bank_transfer' }]);
      expect(body.payment_methods.installments).toBe(10);
    });

    it('com endereço público, manda o cliente de volta e pede o webhook', async () => {
      const { gateway, service } = setup();

      await service.checkout('u1', 'ord1', 'pix');

      const body = gateway.createPreference.mock.calls[0]![0];
      expect(body.back_urls.success).toBe('https://violet-tapir-602845.hostingersite.com/pedidos?pedido=ord1');
      expect(body.auto_return).toBe('approved');
      expect(body.notification_url).toBe('https://violet-tapir-602845.hostingersite.com/api/payments/webhook');
    });

    it('em localhost não manda back_urls nem webhook (o Mercado Pago recusa endereço local)', async () => {
      const { gateway, service } = setup({ appUrl: 'http://localhost:5173' });

      await service.checkout('u1', 'ord1', 'pix');

      const body = gateway.createPreference.mock.calls[0]![0];
      expect(body.back_urls).toBeUndefined();
      expect(body.auto_return).toBeUndefined();
      expect(body.notification_url).toBeUndefined();
    });

    it('só o dono do pedido paga: busca sempre pelo userId', async () => {
      const { prisma, service } = setup();
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.checkout('outro', 'ord1', 'pix')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ord1', userId: 'outro' } }));
    });

    it('pedido já pago não gera novo pagamento', async () => {
      const { prisma, gateway, service } = setup();
      prisma.order.findFirst.mockResolvedValue({ ...ORDER, status: 'PAID' });

      await expect(service.checkout('u1', 'ord1', 'pix')).rejects.toBeInstanceOf(BadRequestException);
      expect(gateway.createPreference).not.toHaveBeenCalled();
    });

    it('sem credencial configurada, avisa que o pagamento está indisponível', async () => {
      const { service } = setup({ accessToken: undefined });

      await expect(service.checkout('u1', 'ord1', 'pix')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('aplicar pagamento', () => {
    it('aprovado com o valor certo: registra o pagamento e marca o pedido como pago', async () => {
      const { prisma, service } = setup();

      await service.applyPayment(mpPayment());

      expect(prisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'ord1' },
          create: expect.objectContaining({ status: 'APPROVED', method: 'CREDIT_CARD', mercadoPagoPaymentId: '9001', amount: 174 }),
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord1' }, data: { status: 'PAID' } });
    });

    it('saldo Mercado Pago no valor do Pix também quita o pedido', async () => {
      const { prisma, service } = setup();

      await service.applyPayment(mpPayment({ payment_type_id: 'account_money', transaction_amount: 156.6 }));

      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord1' }, data: { status: 'PAID' } });
    });

    it('Pix com desconto também quita o pedido', async () => {
      const { prisma, service } = setup();

      await service.applyPayment(mpPayment({ payment_type_id: 'bank_transfer', transaction_amount: 156.6 }));

      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord1' }, data: { status: 'PAID' } });
    });

    it('valor que não bate não quita o pedido', async () => {
      const { prisma, service } = setup();

      await service.applyPayment(mpPayment({ transaction_amount: 1 }));

      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.payment.upsert).not.toHaveBeenCalled();
    });

    it('pendente registra o pagamento mas o pedido continua aguardando', async () => {
      const { prisma, service } = setup();

      await service.applyPayment(mpPayment({ status: 'pending', payment_type_id: 'ticket' }));

      expect(prisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ status: 'PENDING', method: 'BOLETO' }) }),
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('uma tentativa recusada depois de uma aprovada não desfaz o pagamento', async () => {
      const { prisma, service } = setup();
      prisma.payment.findUnique.mockResolvedValue({ status: 'APPROVED', mercadoPagoPaymentId: '9001' });

      await service.applyPayment(mpPayment({ id: 9002, status: 'rejected' }));

      expect(prisma.payment.upsert).not.toHaveBeenCalled();
    });

    it('pagamento de outro sistema (sem pedido nosso) é ignorado', async () => {
      const { prisma, service } = setup();
      prisma.order.findUnique.mockResolvedValue(null);

      await service.applyPayment(mpPayment({ external_reference: 'nao-e-nosso' }));

      expect(prisma.payment.upsert).not.toHaveBeenCalled();
    });
  });

  describe('sincronizar ao voltar do checkout', () => {
    it('procura os pagamentos do pedido e aplica o aprovado', async () => {
      const { gateway, prisma, service } = setup();
      gateway.searchPayments.mockResolvedValue([
        mpPayment({ id: 1, status: 'rejected', date_last_updated: '2026-09-22T12:05:00.000-04:00' }),
        mpPayment({ id: 2, status: 'approved', date_last_updated: '2026-09-22T12:00:00.000-04:00' }),
      ]);

      await service.syncOrder('u1', 'ord1');

      expect(gateway.searchPayments).toHaveBeenCalledWith('ord1');
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord1' }, data: { status: 'PAID' } });
    });
  });

  describe('webhook', () => {
    it('ignora notificações que não são de pagamento', async () => {
      const { gateway, service } = setup();

      await service.handleWebhook({ type: 'merchant_order', dataId: '1' });

      expect(gateway.getPayment).not.toHaveBeenCalled();
    });

    it('nunca confia no corpo: busca o pagamento no Mercado Pago pelo id', async () => {
      const { gateway, prisma, service } = setup();

      await service.handleWebhook({ type: 'payment', dataId: '9001' });

      expect(gateway.getPayment).toHaveBeenCalledWith('9001');
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('com chave configurada, recusa assinatura inválida', async () => {
      const { gateway, service } = setup({ webhookSecret: 'segredo' });

      await expect(
        service.handleWebhook({ type: 'payment', dataId: '9001', xSignature: 'ts=1,v1=00', xRequestId: 'r' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(gateway.getPayment).not.toHaveBeenCalled();
    });

    it('com chave configurada, aceita assinatura válida', async () => {
      const { gateway, service } = setup({ webhookSecret: 'segredo' });
      const v1 = createHmac('sha256', 'segredo').update('id:9001;request-id:r;ts:1;').digest('hex');

      await service.handleWebhook({ type: 'payment', dataId: '9001', xSignature: `ts=1,v1=${v1}`, xRequestId: 'r' });

      expect(gateway.getPayment).toHaveBeenCalledWith('9001');
    });
  });
});
