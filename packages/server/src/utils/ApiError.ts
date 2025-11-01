export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, code?: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || statusCode;
    this.isOperational = isOperational;

    // 维护正确的堆栈跟踪
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // 400 错误请求
  static badRequest(message: string = '请求参数错误') {
    return new ApiError(400, message, 400);
  }

  // 401 未授权
  static unauthorized(message: string = '未授权') {
    return new ApiError(401, message, 401);
  }

  // 403 禁止访问
  static forbidden(message: string = '禁止访问') {
    return new ApiError(403, message, 403);
  }

  // 404 未找到
  static notFound(message: string = '资源不存在') {
    return new ApiError(404, message, 404);
  }

  // 409 冲突
  static conflict(message: string = '资源冲突') {
    return new ApiError(409, message, 409);
  }

  // 500 服务器错误
  static internal(message: string = '服务器内部错误') {
    return new ApiError(500, message, 500, false);
  }
}
