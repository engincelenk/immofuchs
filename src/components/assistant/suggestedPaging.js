export function getSuggestedPage(pool, page, pageSize = 3) {
  const start = page * pageSize;
  const items = pool.slice(start, start + pageSize);
  return {
    items,
    hasPrev: page > 0,
    hasNext: start + pageSize < pool.length,
  };
}
