import { BlogCreateFromGeneratedError } from '../services/blog-create-from-generated';
import { isInsufficientBalanceError } from '../services/deepseek-client';

export function formatDeepSeekErrorResponse(err: unknown): {
  message: string;
  status: number;
  body: string;
} {
  const message = err instanceof Error ? err.message : 'Unknown error';
  const httpStatus =
    err && typeof err === 'object' && 'status' in err
      ? (err as { status?: number }).status
      : err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;

  if (isInsufficientBalanceError(err)) {
    return {
      message,
      status: 402,
      body: `${message} Top up at https://platform.deepseek.com/`,
    };
  }

  const is401 = httpStatus === 401 || message.includes('401');
  const authHint = is401
    ? ' If the key is correct in .env, create a new key at https://platform.deepseek.com/.'
    : '';

  return {
    message,
    status: 500,
    body: `DeepSeek generation failed: ${message}${authHint}`,
  };
}

export function mapCreateBlogError(
  err: unknown
): { badRequest: true; message: string } | { badRequest: false; message: string } {
  if (err instanceof BlogCreateFromGeneratedError) {
    if (
      err.code === 'AUTHOR_NOT_FOUND' ||
      err.code === 'BREADCRUMB_NOT_FOUND' ||
      err.code === 'CATEGORY_NOT_FOUND'
    ) {
      return { badRequest: true, message: err.message };
    }
  }
  return {
    badRequest: false,
    message: err instanceof Error ? err.message : 'Unknown error',
  };
}
