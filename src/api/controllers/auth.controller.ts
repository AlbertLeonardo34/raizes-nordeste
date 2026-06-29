import { Request, Response } from 'express';
import { z } from 'zod';
import { authUseCase } from '../../application/use-cases/auth.usecase';
import { ValidationError } from '../../domain/errors/AppError';

const registerSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  telefone: z.string().optional(),
  consentimentoLGPD: z.boolean({
    required_error: 'consentimentoLGPD é obrigatório',
    invalid_type_error: 'consentimentoLGPD deve ser boolean',
  }),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

export class AuthController {
  async registrar(req: Request, res: Response): Promise<void> {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      const details = parse.error.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      }));
      throw new ValidationError('Dados inválidos', details);
    }
    const result = await authUseCase.registrar(parse.data, req.ip);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      const details = parse.error.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      }));
      throw new ValidationError('Dados inválidos', details);
    }
    const result = await authUseCase.login(parse.data, req.ip);
    res.status(200).json(result);
  }

  async perfil(req: Request, res: Response): Promise<void> {
    const { sub, email, perfil, clienteId } = req.usuario!;
    res.json({ id: sub, email, perfil, clienteId });
  }
}

export const authController = new AuthController();
