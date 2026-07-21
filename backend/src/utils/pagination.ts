export interface PaginationQuery {
  page?: string;
  limit?: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Clamp raw query strings into safe Prisma skip/take values. Never trust the
// client for limit — an unbounded limit is an easy way to make one request
// scan the whole table.
export function parsePagination(query: PaginationQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
