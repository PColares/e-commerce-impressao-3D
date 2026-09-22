import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import { MercadoPagoGateway } from './mercadopago.gateway.js';
import { OrdersPaymentController, PaymentsWebhookController } from './payments.controller.js';
import { PAYMENTS_CONFIG, PaymentsService, type PaymentsConfig } from './payments.service.js';

// Tudo opcional de propósito: sem MERCADOPAGO_ACCESS_TOKEN o app sobe normal e
// só o botão de pagar responde "indisponível" — nunca um 503 no site inteiro.
@Module({
  imports: [AuthModule],
  controllers: [OrdersPaymentController, PaymentsWebhookController],
  providers: [
    {
      provide: PAYMENTS_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PaymentsConfig => ({
        accessToken: config.get<string>('MERCADOPAGO_ACCESS_TOKEN') || undefined,
        appUrl: config.get<string>('APP_URL') || undefined,
        webhookSecret: config.get<string>('MERCADOPAGO_WEBHOOK_SECRET') || undefined,
      }),
    },
    {
      provide: MercadoPagoGateway,
      inject: [PAYMENTS_CONFIG],
      useFactory: (config: PaymentsConfig) => new MercadoPagoGateway(config.accessToken),
    },
    PaymentsService,
  ],
})
export class PaymentsModule {}
