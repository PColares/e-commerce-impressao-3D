import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { MAX_INSTALLMENTS, pixPrice } from '@crealio/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { MercadoPagoGateway, type MpPayment } from './mercadopago.gateway.js';
import { PIX_PREFERENCE_TYPES, amountMatches, mapMethod, mapStatus, verifyWebhookSignature } from './payment-rules.js';

export const PAYMENTS_CONFIG = 'PAYMENTS_CONFIG';

export interface PaymentsConfig {
  accessToken?: string;
  // Endereço público do site, para o Mercado Pago devolver o cliente e mandar o webhook.
  appUrl?: string;
  // Chave de "Webhooks > Configurar notificação" da aplicação no Mercado Pago.
  webhookSecret?: string;
}

export type CheckoutMethod = 'pix' | 'card';

// Tipos de pagamento do Mercado Pago no Brasil. O Pix é bank_transfer.
const ALL_TYPES = ['credit_card', 'debit_card', 'ticket', 'bank_transfer', 'atm', 'prepaid_card', 'account_money'];

// O Mercado Pago recusa back_urls e notification_url locais ("Alguma coisa deu
// errado" no fim do pagamento). Em localhost a confirmação vem pelo syncOrder.
function isPublicUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && !['localhost', '127.0.0.1'].includes(hostname);
  } catch {
    return false;
  }
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MercadoPagoGateway,
    @Inject(PAYMENTS_CONFIG) private readonly config: PaymentsConfig,
  ) {}

  // Cria a preferência do Checkout Pro e devolve o link para onde o cliente vai.
  // Pix e cartão/boleto são preferências separadas porque o Pix tem desconto e
  // o Checkout Pro cobra um preço só por preferência.
  async checkout(userId: string, orderId: string, method: CheckoutMethod) {
    if (!this.config.accessToken) throw new ServiceUnavailableException('Pagamento indisponível no momento.');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { quote: { select: { fileName: true } } },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (order.status !== 'AWAITING_PAYMENT') throw new BadRequestException('Este pedido já foi pago.');

    const total = Number(order.totalPrice);
    const base = this.config.appUrl?.replace(/\/+$/, '');
    const returnUrl = `${base}/pedidos?pedido=${order.id}`;

    const preference = await this.gateway.createPreference({
      items: [
        {
          id: order.id,
          title: `Impressão 3D — ${order.quote?.fileName ?? `pedido ${order.id.slice(-6)}`}`,
          quantity: 1,
          unit_price: method === 'pix' ? pixPrice(total) : total,
          currency_id: 'BRL',
        },
      ],
      external_reference: order.id,
      statement_descriptor: 'CREALIO',
      payment_methods:
        method === 'pix'
          ? { excluded_payment_types: ALL_TYPES.filter((t) => !PIX_PREFERENCE_TYPES.includes(t)).map((id) => ({ id })) }
          : { excluded_payment_types: [{ id: 'bank_transfer' }], installments: MAX_INSTALLMENTS },
      ...(isPublicUrl(base)
        ? {
            back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
            auto_return: 'approved',
            notification_url: `${base}/api/payments/webhook`,
          }
        : {}),
    });

    return { checkoutUrl: preference.init_point };
  }

  // Chamado quando o cliente volta do checkout (ou clica em "Já paguei"): pergunta
  // ao Mercado Pago pelos pagamentos do pedido em vez de esperar o webhook.
  async syncOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    const payments = await this.gateway.searchPayments(orderId);
    // O aprovado vale mais que qualquer tentativa recusada depois dele.
    const best = payments.find((p) => p.status === 'approved') ?? payments[0];
    if (best) await this.applyPayment(best);

    return this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  }

  async handleWebhook(input: { type?: string; dataId?: string; xSignature?: string; xRequestId?: string }) {
    if (this.config.webhookSecret) {
      const valid = verifyWebhookSignature({
        secret: this.config.webhookSecret,
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
        dataId: input.dataId,
      });
      if (!valid) throw new UnauthorizedException('Assinatura inválida.');
    }
    if (input.type !== 'payment' || !input.dataId) return;

    // O corpo da notificação só diz "olhe o pagamento X"; o status e o valor
    // vêm sempre da API do Mercado Pago, nunca da notificação.
    await this.applyPayment(await this.gateway.getPayment(input.dataId));
  }

  async applyPayment(mp: MpPayment) {
    if (!mp.external_reference) return;

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: mp.external_reference! } });
      if (!order) return;

      const method = mapMethod(mp.payment_type_id);
      const status = mapStatus(mp.status);
      if (!amountMatches(Number(order.totalPrice), mp.payment_type_id, mp.transaction_amount)) {
        console.error(
          `Pagamento ${mp.id} do pedido ${order.id} com valor ${mp.transaction_amount} não bate com o total ${order.totalPrice}. Ignorado.`,
        );
        return;
      }

      // Uma tentativa recusada depois de um pagamento aprovado não desfaz nada;
      // só um estorno (REFUNDED) muda um pagamento aprovado.
      const current = await tx.payment.findUnique({ where: { orderId: order.id } });
      if (current?.status === 'APPROVED' && status !== 'REFUNDED' && current.mercadoPagoPaymentId !== String(mp.id)) {
        return;
      }

      const data = { method, status, mercadoPagoPaymentId: String(mp.id), amount: mp.transaction_amount };
      await tx.payment.upsert({ where: { orderId: order.id }, create: { orderId: order.id, ...data }, update: data });

      if (status === 'APPROVED' && order.status === 'AWAITING_PAYMENT') {
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
      }
    });
  }
}
