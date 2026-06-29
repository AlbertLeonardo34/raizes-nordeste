import { Request, Response } from 'express';
import { z } from 'zod';
import { TipoMovimentacao } from '@prisma/client';
import { estoqueUseCase } from '../../application/use-cases/estoque.usecase';
import { ValidationError } from '../../domain/errors/AppError';

const movimentacaoSchema = z.object({
  produtoId: z.string().uuid('produtoId deve ser um UUID válido'),
  tipo: z.nativeEnum(TipoMovimentacao, {
    errorMap: () => ({ message: 'tipo deve ser ENTRADA ou SAIDA' }),
  }),
  quantidade: z.number().int().positive('Quantidade deve ser inteira e positiva'),
  motivo: z.string().min(1, 'Motivo é obrigatório'),
});

export class EstoqueController {
  async listarPorUnidade(req: Request, res: Response): Promise<void> {
    const result = await estoqueUseCase.listarPorUnidade(req.params.unidadeId);
    res.json({ data: result });
  }

  async movimentar(req: Request, res: Response): Promise<void> {
    const parse = movimentacaoSchema.safeParse(req.body);
    if (!parse.success) {
      const details = parse.error.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      }));
      throw new ValidationError('Dados inválidos', details);
    }

    const result = await estoqueUseCase.movimentar(
      req.params.unidadeId,
      parse.data.produtoId,
      parse.data.tipo,
      parse.data.quantidade,
      parse.data.motivo,
      req.usuario!.sub
    );
    res.json(result);
  }

  async saldo(req: Request, res: Response): Promise<void> {
    const result = await estoqueUseCase.consultarSaldo(
      req.params.unidadeId,
      req.params.produtoId
    );
    res.json(result);
  }
}

export const estoqueController = new EstoqueController();
