export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: any[];

  constructor(message: string, statusCode = 400, errorCode = 'BAD_REQUEST', details: any[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 401, 'NAO_AUTENTICADO');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sem permissão para esta ação') {
    super(message, 403, 'SEM_PERMISSAO');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NAO_ENCONTRADO');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details: any[] = []) {
    super(message, 409, 'CONFLITO', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: any[] = []) {
    super(message, 422, 'VALIDACAO_INVALIDA', details);
  }
}
