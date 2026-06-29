import { logger } from '../logging/logger';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentRequest {
  pedidoId: string;
  valor: number;
  formaPagamento: string;
  clienteId: string;
}

export interface PaymentResponse {
  gatewayId: string;
  status: 'APROVADO' | 'RECUSADO';
  mensagem: string;
  timestamp: string;
}

/**
 * Serviço de pagamento MOCK.
 * A Raízes do Nordeste não processa pagamentos diretamente.
 * Este serviço simula a integração com um gateway externo.
 * Em produção, seria substituído por uma integração real (ex: Stripe, PagSeguro).
 */
export class PaymentService {
  async processar(request: PaymentRequest): Promise<PaymentResponse> {
    logger.info(`[PAYMENT_MOCK] Solicitando pagamento para pedido ${request.pedidoId}`, {
      valor: request.valor,
      forma: request.formaPagamento,
    });

    // Simula latência do gateway externo
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Simula recusa para valor muito alto (teste de negação)
    const recusado = request.formaPagamento === 'RECUSADO_MOCK';

    const response: PaymentResponse = {
      gatewayId: uuidv4(),
      status: recusado ? 'RECUSADO' : 'APROVADO',
      mensagem: recusado ? 'Pagamento recusado pela operadora' : 'Pagamento aprovado com sucesso',
      timestamp: new Date().toISOString(),
    };

    logger.info(`[PAYMENT_MOCK] Resultado: ${response.status} | Gateway ID: ${response.gatewayId}`);

    return response;
  }
}

export const paymentService = new PaymentService();
