import { TipoMovimentacao, Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma/client';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { auditoriaService } from '../../infrastructure/logging/auditoria.service';

export class EstoqueUseCase {
  async listarPorUnidade(unidadeId: string) {
    const unidade = await prisma.unidade.findUnique({ where: { id: unidadeId } });
    if (!unidade) throw new NotFoundError('Unidade');

    return prisma.estoqueUnidade.findMany({
      where: { unidadeId },
      include: { produto: true },
      orderBy: { produto: { nome: 'asc' } },
    });
  }

  async movimentar(
    unidadeId: string,
    produtoId: string,
    tipo: TipoMovimentacao,
    quantidade: number,
    motivo: string,
    usuarioId: string
  ) {
    if (quantidade <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero', [
        { field: 'quantidade', issue: 'Deve ser > 0' },
      ]);
    }

    const estoque = await prisma.estoqueUnidade.findUnique({
      where: { unidadeId_produtoId: { unidadeId, produtoId } },
    });

    if (!estoque) throw new NotFoundError('Estoque para este produto/unidade');

    if (tipo === TipoMovimentacao.SAIDA && estoque.quantidade < quantidade) {
      throw new ValidationError('Estoque insuficiente', [
        { field: 'quantidade', issue: `Disponível: ${estoque.quantidade}` },
      ]);
    }

    const novaQtd =
      tipo === TipoMovimentacao.ENTRADA
        ? estoque.quantidade + quantidade
        : estoque.quantidade - quantidade;

    const [estoqueAtualizado, movimentacao] = await prisma.$transaction([
      prisma.estoqueUnidade.update({
        where: { id: estoque.id },
        data: { quantidade: novaQtd },
        include: { produto: true, unidade: true },
      }),
      prisma.movimentacaoEstoque.create({
        data: { estoqueId: estoque.id, tipo, quantidade, motivo },
      }),
    ]);

    await auditoriaService.registrar({
      usuarioId,
      acao: `ESTOQUE_${tipo}`,
      detalhes: {
        unidadeId,
        produtoId,
        quantidade,
        saldoAnterior: estoque.quantidade,
        saldoAtual: novaQtd,
      },
    });

    return { estoque: estoqueAtualizado, movimentacao, saldoAtual: novaQtd };
  }

  async consultarSaldo(unidadeId: string, produtoId: string) {
    const estoque = await prisma.estoqueUnidade.findUnique({
      where: { unidadeId_produtoId: { unidadeId, produtoId } },
      include: { produto: true, unidade: true },
    });
    if (!estoque) throw new NotFoundError('Estoque');
    return estoque;
  }
}

export const estoqueUseCase = new EstoqueUseCase();
