import { prisma } from '../../infrastructure/database/prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../../domain/errors/AppError';

export class FidelidadeUseCase {
  async consultar(clienteId: string, usuarioId: string, perfil: string) {
    // Verifica se o cliente está acessando seus próprios dados (LGPD)
    if (perfil === 'CLIENTE') {
      const cliente = await prisma.cliente.findUnique({ where: { usuarioId } });
      if (cliente?.id !== clienteId) throw new ForbiddenError('Acesso negado a dados de outro cliente');
    }

    const fidelidade = await prisma.fidelidade.findUnique({
      where: { clienteId },
      include: {
        historico: { orderBy: { createdAt: 'desc' }, take: 20 },
        cliente: { include: { usuario: { select: { nome: true, email: true } } } },
      },
    });

    if (!fidelidade) throw new NotFoundError('Fidelidade');
    return fidelidade;
  }

  async resgatar(clienteId: string, pontos: number, usuarioId: string) {
    if (pontos <= 0) throw new ValidationError('Pontos inválidos', [{ field: 'pontos', issue: 'Deve ser > 0' }]);

    const fidelidade = await prisma.fidelidade.findUnique({ where: { clienteId } });
    if (!fidelidade) throw new NotFoundError('Fidelidade');

    if (fidelidade.pontos < pontos) {
      throw new ValidationError('Pontos insuficientes', [
        { field: 'pontos', issue: `Disponível: ${fidelidade.pontos}` },
      ]);
    }

    return prisma.fidelidade.update({
      where: { clienteId },
      data: {
        pontos: { decrement: pontos },
        historico: {
          create: { pontos: -pontos, descricao: `Resgate de ${pontos} pontos` },
        },
      },
    });
  }
}

export const fidelidadeUseCase = new FidelidadeUseCase();
