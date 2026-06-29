import { Request, Response } from 'express';
import { z } from 'zod';
import { fidelidadeUseCase } from '../../application/use-cases/fidelidade.usecase';
import { ValidationError } from '../../domain/errors/AppError';

const resgatarSchema = z.object({
  pontos: z.number({
    required_error: 'pontos é obrigatório',
    invalid_type_error: 'pontos deve ser um número',
  }).int('pontos deve ser inteiro').positive('pontos deve ser positivo'),
});

export class FidelidadeController {
  async consultar(req: Request, res: Response): Promise<void> {
    const result = await fidelidadeUseCase.consultar(
      req.params.clienteId,
      req.usuario!.sub,
      req.usuario!.perfil
    );
    res.json(result);
  }

  async resgatar(req: Request, res: Response): Promise<void> {
    const parse = resgatarSchema.safeParse(req.body);
    if (!parse.success) {
      const details = parse.error.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      }));
      throw new ValidationError('Dados inválidos', details);
    }
    const result = await fidelidadeUseCase.resgatar(
      req.params.clienteId,
      parse.data.pontos,
      req.usuario!.sub
    );
    res.json(result);
  }
}

export const fidelidadeController = new FidelidadeController();
