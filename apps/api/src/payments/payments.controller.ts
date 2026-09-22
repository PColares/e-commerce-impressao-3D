import { Body, Controller, Headers, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { PaymentsService, type CheckoutMethod } from './payments.service.js';

class CheckoutDto {
  @ApiProperty({ enum: ['pix', 'card'] })
  @IsIn(['pix', 'card'])
  method!: CheckoutMethod;
}

@ApiTags('pagamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersPaymentController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':id/checkout')
  checkout(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CheckoutDto) {
    return this.payments.checkout(user.id, id, dto.method);
  }

  @Post(':id/sync')
  @HttpCode(200)
  sync(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.payments.syncOrder(user.id, id);
  }
}

// Público: quem chama é o Mercado Pago. O id vem na query (?data.id=…&type=…) e
// também no corpo; o status nunca é lido daqui (ver PaymentsService.handleWebhook).
@ApiTags('pagamentos')
@Controller('payments')
export class PaymentsWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Query() query: Record<string, string | undefined>,
    @Body() body: { type?: string; data?: { id?: string | number } },
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    await this.payments.handleWebhook({
      type: query.type ?? body?.type,
      dataId: query['data.id'] ?? (body?.data?.id !== undefined ? String(body.data.id) : undefined),
      xSignature,
      xRequestId,
    });
    return { received: true };
  }
}
