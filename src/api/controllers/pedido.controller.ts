import { Request, Response } from 'express';
import { z } from 'zod';
import { CanalPedido, StatusPedido } from '@prisma/client';
import { pedidoUseCase } from '../../application/use-cases/pedido.usecase';
import { ValidationError, NotFoundError } from '../../domain/errors/AppError';
import { prisma } from '../../infrastructure/database/prisma/client';

const criarPedidoSchema = z.object({
  unidadeId: z.string().uuid('unidadeId deve ser um UUID válido'),
  canalPedido: z.nativeEnum(CanalPedido, {
    errorMap: () => ({
      message: `canalPedido deve ser: ${Object.values(CanalPedido).join(', ')}`,
    }),
  }),
  itens: z
    .array(
      z.object({
        produtoId: z.string().uuid('produtoId deve ser um UUID válido'),
        quantidade: z.number().int().positive('Quantidade deve ser positiva'),
      })
    )
    .min(1, 'Pedido deve ter pelo menos 1 item'),
  formaPagamento: z.string().min(1, 'formaPagamento é obrigatório'),
  observacoes: z.string().optional(),
});

const statusValidos = Object.values(StatusPedido);

export class PedidoController {
  async criar(req: Request, res: Response): Promise<void> {
    const parse = criarPedidoSchema.safeParse(req.body);
    if (!parse.success) {
      const details = parse.error.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      }));
      throw new ValidationError('Dados inválidos', details);
    }

    const usuarioId = req.usuario!.sub;
    const cliente = await prisma.cliente.findUnique({ where: { usuarioId } });
    if (!cliente) throw new NotFoundError('Cliente');

    const result = await pedidoUseCase.criar(cliente.id, usuarioId, parse.data, req.ip);
    res.status(201).json(result);
  }

  async listar(req: Request, res: Response): Promise<void> {
    const { canalPedido, status, unidadeId, page, limit } = req.query;
    const { sub: usuarioId, perfil } = req.usuario!;

    let clienteId: string | undefined;
    if (perfil === 'CLIENTE') {
      const cliente = await prisma.cliente.findUnique({ where: { usuarioId } });
      clienteId = cliente?.id;
    }

    const result = await pedidoUseCase.listar({
      clienteId,
      canalPedido: canalPedido as CanalPedido | undefined,
      status: status as StatusPedido | undefined,
      unidadeId: unidadeId as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });

    res.json(result);
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await pedidoUseCase.buscarPorId(
      id,
      req.usuario!.sub,
      req.usuario!.perfil
    );
    res.json(result);
  }

  async atualizarStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    if (!statusValidos.includes(status)) {
      throw new ValidationError('Status inválido', [
        { field: 'status', issue: `Deve ser um de: ${statusValidos.join(', ')}` },
      ]);
    }

    const result = await pedidoUseCase.atualizarStatus(
      id,
      status as StatusPedido,
      req.usuario!.sub,
      req.ip
    );
    res.json(result);
  }
}

export const pedidoController = new PedidoController();
