// Patron comun para paginacion por cursor: se pide "limit + 1" filas: si
// llegan de mas, hay una pagina siguiente y el cursor es el id de la
// ultima fila que SI se devuelve (no de la extra, que se descarta).
export function paginateByCursor<T extends { id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
