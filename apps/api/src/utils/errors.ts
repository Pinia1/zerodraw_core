import { ResponseMessage } from '@zeroDraw/api-contract';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, code?: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BusinessError extends AppError {
  constructor(message: string, code?: number) {
    super(400, message, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = ResponseMessage.BAD_REQUEST) {
    super(400, message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = ResponseMessage.UNAUTHORIZED) {
    super(401, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = ResponseMessage.FORBIDDEN) {
    super(403, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = ResponseMessage.NOT_FOUND) {
    super(404, message, 404);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = ResponseMessage.INTERNAL_SERVER_ERROR) {
    super(500, message, 500, false);
  }
}
