import { BlogGenerateValidationError } from '../services/blog-generate-request-validator';

export interface ValidationErrorBody {
  status: number;
  name: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export function formatValidationErrorResponse(
  err: BlogGenerateValidationError
): ValidationErrorBody {
  return {
    status: 400,
    name: 'BadRequest',
    message: err.message,
    code: err.code,
    details: err.details
      ? {
          field: err.details.field,
          allowedValues: err.details.allowedValues,
        }
      : undefined,
  };
}

export function isBlogGenerateValidationError(
  err: unknown
): err is BlogGenerateValidationError {
  return err instanceof BlogGenerateValidationError;
}
