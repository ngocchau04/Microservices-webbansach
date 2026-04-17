/**
 * Normalize catalog API responses (list + search) into a product array.
 * Handles axios + withNormalizedResponse merge shapes.
 */
export function extractProductItemsFromCatalogResponse(res) {
  const d = res?.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  const items = d.items ?? d.products ?? d.data?.items ?? d.legacy?.products;
  return Array.isArray(items) ? items : [];
}

/** Deduplicate by Mongo id so multiple fetches don’t double-count authors. */
export function dedupeProductsById(products = []) {
  const map = new Map();
  for (const p of products) {
    const id = p?._id != null ? String(p._id) : "";
    if (!id) continue;
    if (!map.has(id)) map.set(id, p);
  }
  return Array.from(map.values());
}

/**
 * Group catalog products by author for the featured-authors directory.
 * Uses the same product shape as listing/search (author string on each item).
 */
export function buildAuthorDirectory(products = []) {
  const byAuthor = new Map();

  for (const p of products) {
    const name = typeof p.author === "string" ? p.author.trim() : "";
    if (!name) {
      continue;
    }
    if (!byAuthor.has(name)) {
      byAuthor.set(name, []);
    }
    byAuthor.get(name).push(p);
  }

  return Array.from(byAuthor.entries())
    .map(([name, books]) => ({
      name,
      count: books.length,
      sampleBooks: books.slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
}
