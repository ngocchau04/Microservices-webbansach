/**
 * Group catalog products by author for the featured-authors directory.
 * No backend change — same data the list page uses.
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
