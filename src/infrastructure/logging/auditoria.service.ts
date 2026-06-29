import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma/client';
import { logger } from './logger';

interface AuditoriaParams {
  usuarioId?: string;
  pedidoId?: string;
  acao: string;
  detalhes?: Record<string, unknown>;
  ip?: string;
}

/**
 * Serviço de Auditoria — LGPD e rastreabilidade.
 * Registra todas as ações sensíveis no banco de dados.
 */
export class AuditoriaService {
  async registrar(params: AuditoriaParams): Promise<void> {
    try {
      await prisma.auditoriaAcao.create({
        data: {
          usuarioId: params.usuarioId ?? null,
          pedidoId: params.pedidoId ?? null,
          acao: params.acao,
          detalhes: (params.detalhes ?? {}) as Prisma.InputJsonValue,
          ip: params.ip ?? null,
        },
      });
      logger.info(`[AUDITORIA] ${params.acao}`, {
        usuarioId: params.usuarioId,
        pedidoId: params.pedidoId,
      });
    } catch (err) {
      // Auditoria nunca derruba o fluxo principal
      logger.error('[AUDITORIA] Falha ao registrar auditoria', { err, acao: params.acao });
    }
  }
}

export const auditoriaService = new AuditoriaService();
