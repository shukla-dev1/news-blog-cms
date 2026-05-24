export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export type PaginationParseSuccess = {
  ok: true;
  page: number;
  pageSize: number;
};

export type PaginationParseError = {
  ok: false;
  message: string;
};

export type PaginationParseResult = PaginationParseSuccess | PaginationParseError;

function parsePositiveInt(
  value: unknown,
  fallback: number,
  { min = 1, max }: { min?: number; max?: number } = {},
): number | null {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return null;
  }

  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
}

export function parsePaginationFromQuery(
  query: Record<string, unknown>,
): PaginationParseResult {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  if (page === null) {
    return { ok: false, message: 'page must be a positive integer' };
  }

  const pageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE, {
    max: MAX_PAGE_SIZE,
  });
  if (pageSize === null) {
    return { ok: false, message: 'pageSize must be a positive integer' };
  }

  return { ok: true, page, pageSize };
}

export function buildPaginationMeta({
  page,
  pageSize,
  total,
}: PaginationParams & { total: number }): PaginationMeta {
  return {
    page,
    pageSize,
    pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
    total,
  };
}
