import { Request, Response, NextFunction } from 'express';
import { jwtService, JwtPayload } from '../../infrastructure/auth/jwt.service';
import { UnauthorizedError, ForbiddenError } from '../../domain/errors/AppError';

// Extende o tipo Request do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}

export function autenticar(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new UnauthorizedError('Token não fornecido');
  }

  // Tolera erros comuns de colagem: "Bearer" duplicado, aspas extras, espaços
  let token = authHeader.trim();
  while (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '').trim();
  }
  token = token.replace(/^"+|"+$/g, '').trim();

  if (!token) {
    throw new UnauthorizedError('Token não fornecido');
  }

  req.usuario = jwtService.verify(token);
  next();
}

export function autorizar(...perfisPermitidos: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) throw new UnauthorizedError();
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      throw new ForbiddenError(`Acesso restrito a: ${perfisPermitidos.join(', ')}`);
    }
    next();
  };
}
