import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../domain/errors/AppError';

export interface JwtPayload {
  sub: string;
  email: string;
  perfil: string;
  clienteId?: string;
}

export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'fallback_secret_nao_use_em_producao_32chars';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
  }

  verify(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload & JwtPayload;
      return {
        sub: decoded.sub as string,
        email: decoded.email,
        perfil: decoded.perfil,
        clienteId: decoded.clienteId,
      };
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  }
}

export const jwtService = new JwtService();
