import { ServiceUnavailableException } from '@nestjs/common';

const API = 'https://api.mercadopago.com';

// O que usamos de um pagamento do Mercado Pago (GET /v1/payments/:id).
export interface MpPayment {
  id: number;
  status: string;
  payment_type_id: string;
  transaction_amount: number;
  external_reference: string | null;
  date_last_updated?: string;
}

// Chamadas REST diretas, sem o SDK: são três endpoints, e assim o serviço é
// testado com um objeto simples no lugar deste.
export class MercadoPagoGateway {
  constructor(
    private readonly accessToken: string | undefined,
    private readonly http: typeof fetch = fetch,
  ) {}

  createPreference(body: unknown): Promise<{ id: string; init_point: string }> {
    return this.call('/checkout/preferences', { method: 'POST', body: JSON.stringify(body) });
  }

  getPayment(id: string): Promise<MpPayment> {
    return this.call(`/v1/payments/${encodeURIComponent(id)}`);
  }

  async searchPayments(externalReference: string): Promise<MpPayment[]> {
    const params = new URLSearchParams({ external_reference: externalReference, sort: 'date_created', criteria: 'desc' });
    const page = await this.call<{ results: MpPayment[] }>(`/v1/payments/search?${params}`);
    return page.results ?? [];
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.accessToken) throw new ServiceUnavailableException('Pagamento indisponível no momento.');
    const response = await this.http(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.accessToken}`, ...init.headers },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // O detalhe vai para o log do servidor; o cliente recebe uma mensagem neutra.
      console.error(`Mercado Pago ${init.method ?? 'GET'} ${path} → ${response.status}: ${detail.slice(0, 500)}`);
      throw new ServiceUnavailableException('Não foi possível falar com o Mercado Pago. Tente de novo em instantes.');
    }
    return response.json() as Promise<T>;
  }
}
