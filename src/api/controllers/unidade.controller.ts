import { Request, Response } from 'express';
import { prisma } from '../../infrastructure/database/prisma/client';
import { NotFoundError } from '../../domain/errors/AppError';

export class UnidadeController {
  async listar(_req: Request, res: Response): Promise<void> {
    const unidades = await prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
    });
    res.json({ data: unidades });
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    const unidade = await prisma.unidade.findUnique({ where: { id: req.params.id } });
    if (!unidade) throw new NotFoundError('Unidade');
    res.json(unidade);
  }

  async cardapio(req: Request, res: Response): Promise<void> {
    const unidade = await prisma.unidade.findUnique({ where: { id: req.params.id } });
    if (!unidade) throw new NotFoundError('Unidade');

    const estoques = await prisma.estoqueUnidade.findMany({
      where: { unidadeId: req.params.id, quantidade: { gt: 0 } },
      include: { produto: true },
      orderBy: { produto: { categoria: 'asc' } },
    });

    const cardapio = estoques
      .filter((e) => e.produto.disponivel)
      .map((e) => ({
        produtoId: e.produto.id,
        nome: e.produto.nome,
        descricao: e.produto.descricao,
        preco: Number(e.produto.preco),
        categoria: e.produto.categoria,
        sazonal: e.produto.sazonal,
        quantidadeDisponivel: e.quantidade,
      }));

    res.json({ unidade: { id: unidade.id, nome: unidade.nome, cidade: unidade.cidade }, cardapio });
  }
}

export const unidadeController = new UnidadeController();
