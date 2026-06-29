import { CanalPedido, StatusPedido, StatusPagamento, TipoMovimentacao, Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma/client';
import { paymentService } from '../../infrastructure/payment/payment.service';
import { auditoriaService } from '../../infrastructure/logging/auditoria.service';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../domain/errors/AppError';

interface ItemDTO {
  produtoId: string;
  quantidade: number;
}

interface CriarPedidoDTO {
  unidadeId: string;
  itens: ItemDTO[];
  canalPedido: CanalPedido;
  formaPagamento: string;
  observacoes?: string;
}

export class PedidoUseCase {
  /**
   * FLUXO CRÍTICO: Criar pedido → Validar estoque → Mock pagamento → Atualizar status
   */
  async criar(clienteId: string, usuarioId: string, data: CriarPedidoDTO, ip?: string) {
    if (!data.itens || data.itens.length === 0) {
      throw new ValidationError('O pedido deve ter pelo menos 1 item', [
        { field: 'itens', issue: 'Lista de itens vazia' },
      ]);
    }

    const unidade = await prisma.unidade.findUnique({ where: { id: data.unidadeId } });
    if (!unidade || !unidade.ativa) throw new NotFoundError('Unidade');

    // Verifica estoque e calcula total
    let total = 0;
    const itensComPreco: Array<{ produto: any; item: ItemDTO; subtotal: number }> = [];
    const errosEstoque: any[] = [];

    for (const item of data.itens) {
      const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      if (!produto || !produto.disponivel) {
        throw new NotFoundError(`Produto ${item.produtoId}`);
      }

      const estoque = await prisma.estoqueUnidade.findUnique({
        where: {
          unidadeId_produtoId: { unidadeId: data.unidadeId, produtoId: item.produtoId },
        },
      });

      if (!estoque || estoque.quantidade < item.quantidade) {
        errosEstoque.push({
          field: `itens[${data.itens.indexOf(item)}].quantidade`,
          issue: `Disponível: ${estoque?.quantidade ?? 0}`,
        });
      } else {
        const subtotal = Number(produto.preco) * item.quantidade;
        total += subtotal;
        itensComPreco.push({ produto, item, subtotal });
      }
    }

    if (errosEstoque.length > 0) {
      throw new ConflictError('Não há quantidade suficiente para um ou mais itens.', errosEstoque);
    }

    // Cria pedido + decrementa estoque em transação atômica
    const pedido = await prisma.$transaction(async (tx) => {
      const novoPedido = await tx.pedido.create({
        data: {
          clienteId,
          unidadeId: data.unidadeId,
          canalPedido: data.canalPedido,
          status: StatusPedido.AGUARDANDO_PAGAMENTO,
          total: new Prisma.Decimal(total),
          observacoes: data.observacoes ?? null,
          itens: {
            create: itensComPreco.map(({ produto, item, subtotal }) => ({
              produtoId: produto.id,
              quantidade: item.quantidade,
              precoUnitario: produto.preco,
              subtotal: new Prisma.Decimal(subtotal),
            })),
          },
        },
        include: { itens: { include: { produto: true } } },
      });

      // Decrementa estoque e registra movimentação
      for (const { item } of itensComPreco) {
        const estoqueAtual = await tx.estoqueUnidade.findUnique({
          where: {
            unidadeId_produtoId: { unidadeId: data.unidadeId, produtoId: item.produtoId },
          },
        });

        await tx.estoqueUnidade.update({
          where: {
            unidadeId_produtoId: { unidadeId: data.unidadeId, produtoId: item.produtoId },
          },
          data: { quantidade: { decrement: item.quantidade } },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            estoqueId: estoqueAtual!.id,
            tipo: TipoMovimentacao.SAIDA,
            quantidade: item.quantidade,
            motivo: `Pedido ${novoPedido.id}`,
          },
        });
      }

      return novoPedido;
    });

    // Integração com gateway externo (mock)
    const pagamentoResult = await paymentService.processar({
      pedidoId: pedido.id,
      valor: total,
      formaPagamento: data.formaPagamento,
      clienteId,
    });

    const statusPagamento =
      pagamentoResult.status === 'APROVADO'
        ? StatusPagamento.APROVADO
        : StatusPagamento.RECUSADO;

    const statusPedido =
      pagamentoResult.status === 'APROVADO'
        ? StatusPedido.EM_PREPARO
        : StatusPedido.CANCELADO;

    // Persiste pagamento e atualiza status em transação
    await prisma.$transaction([
      prisma.pagamento.create({
        data: {
          pedidoId: pedido.id,
          formaPagamento: data.formaPagamento,
          status: statusPagamento,
          valorTotal: new Prisma.Decimal(total),
          gatewayId: pagamentoResult.gatewayId,
          gatewayResposta: pagamentoResult as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.pedido.update({
        where: { id: pedido.id },
        data: { status: statusPedido },
      }),
    ]);

    // Auditoria
    await auditoriaService.registrar({
      usuarioId,
      pedidoId: pedido.id,
      acao: 'PEDIDO_CRIADO',
      detalhes: { canal: data.canalPedido, total, pagamento: pagamentoResult.status },
      ip,
    });

    // Fidelidade — 1 ponto por real, só se pagamento aprovado
    if (pagamentoResult.status === 'APROVADO') {
      const pontos = Math.floor(total);
      const fidelidade = await prisma.fidelidade.findUnique({ where: { clienteId } });
      if (fidelidade) {
        await prisma.fidelidade.update({
          where: { clienteId },
          data: {
            pontos: { increment: pontos },
            historico: {
              create: { pontos, descricao: `Pedido ${pedido.id} — +${pontos} pontos` },
            },
          },
        });
      }
    }

    return {
      pedidoId: pedido.id,
      status: statusPedido,
      total,
      canalPedido: data.canalPedido,
      pagamento: {
        status: pagamentoResult.status,
        gatewayId: pagamentoResult.gatewayId,
        mensagem: pagamentoResult.mensagem,
      },
      itens: pedido.itens.map((i) => ({
        produtoId: i.produtoId,
        quantidade: i.quantidade,
        precoUnitario: Number(i.precoUnitario),
        subtotal: Number(i.subtotal),
      })),
      createdAt: pedido.createdAt,
    };
  }

  async listar(filtros: {
    clienteId?: string;
    canalPedido?: CanalPedido;
    status?: StatusPedido;
    unidadeId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(filtros.page || 1, 1);
    const limit = Math.min(filtros.limit || 10, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.PedidoWhereInput = {};
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.canalPedido) where.canalPedido = filtros.canalPedido;
    if (filtros.status) where.status = filtros.status;
    if (filtros.unidadeId) where.unidadeId = filtros.unidadeId;

    const [pedidos, total] = await Promise.all([
      prisma.pedido.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          itens: { include: { produto: { select: { nome: true, preco: true } } } },
          pagamento: { select: { status: true, formaPagamento: true } },
          unidade: { select: { nome: true, cidade: true } },
        },
      }),
      prisma.pedido.count({ where }),
    ]);

    return {
      data: pedidos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async buscarPorId(pedidoId: string, usuarioId: string, perfil: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        itens: { include: { produto: true } },
        pagamento: true,
        unidade: true,
        cliente: { include: { usuario: { select: { nome: true, email: true } } } },
      },
    });

    if (!pedido) throw new NotFoundError('Pedido');

    // CLIENTE só vê seus próprios pedidos
    if (perfil === 'CLIENTE') {
      const cliente = await prisma.cliente.findUnique({ where: { usuarioId } });
      if (pedido.clienteId !== cliente?.id) throw new ForbiddenError();
    }

    return pedido;
  }

  async atualizarStatus(
    pedidoId: string,
    novoStatus: StatusPedido,
    usuarioId: string,
    ip?: string
  ) {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new NotFoundError('Pedido');

    const statusAnterior = pedido.status;
    await prisma.pedido.update({ where: { id: pedidoId }, data: { status: novoStatus } });

    await auditoriaService.registrar({
      usuarioId,
      pedidoId,
      acao: 'STATUS_PEDIDO_ATUALIZADO',
      detalhes: { de: statusAnterior, para: novoStatus },
      ip,
    });

    return { pedidoId, statusAnterior, novoStatus };
  }
}

export const pedidoUseCase = new PedidoUseCase();
