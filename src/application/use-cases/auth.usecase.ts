import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma/client';
import { jwtService } from '../../infrastructure/auth/jwt.service';
import { auditoriaService } from '../../infrastructure/logging/auditoria.service';
import { AppError, ValidationError } from '../../domain/errors/AppError';
import { Perfil } from '@prisma/client';

interface RegisterDTO {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  consentimentoLGPD: boolean;
}

interface LoginDTO {
  email: string;
  senha: string;
}

export class AuthUseCase {
  async registrar(data: RegisterDTO, ip?: string) {
    if (!data.consentimentoLGPD) {
      throw new ValidationError('O consentimento LGPD é obrigatório para cadastro', [
        { field: 'consentimentoLGPD', issue: 'Deve ser true — LGPD exige consentimento explícito' },
      ]);
    }

    const emailExistente = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (emailExistente) {
      throw new AppError('E-mail já cadastrado', 409, 'EMAIL_DUPLICADO');
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        perfil: Perfil.CLIENTE,
        cliente: {
          create: {
            telefone: data.telefone ?? null,
            consentimentoLGPD: true,
            dataConsentimento: new Date(),
            fidelidade: { create: { pontos: 0 } },
          },
        },
      },
      include: { cliente: true },
    });

    await auditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'USUARIO_CADASTRADO',
      detalhes: { email: usuario.email, lgpd: true },
      ip,
    });

    const token = jwtService.sign({
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      clienteId: usuario.cliente?.id,
    });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  }

  async login(data: LoginDTO, ip?: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { email: data.email },
      include: { cliente: true },
    });

    // Mensagem genérica para não vazar se e-mail existe
    if (!usuario || !usuario.ativo) {
      throw new AppError('E-mail ou senha inválidos', 401, 'CREDENCIAIS_INVALIDAS');
    }

    const senhaValida = await bcrypt.compare(data.senha, usuario.senha);
    if (!senhaValida) {
      throw new AppError('E-mail ou senha inválidos', 401, 'CREDENCIAIS_INVALIDAS');
    }

    await auditoriaService.registrar({
      usuarioId: usuario.id,
      acao: 'LOGIN_REALIZADO',
      detalhes: { email: usuario.email },
      ip,
    });

    const token = jwtService.sign({
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      clienteId: usuario.cliente?.id,
    });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  }
}

export const authUseCase = new AuthUseCase();
