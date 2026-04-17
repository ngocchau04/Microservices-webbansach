import { getProducts, searchProducts } from "../../api/catalogApi";
import { dedupeProductsById, extractProductItemsFromCatalogResponse } from "./aggregateAuthors";

/**
 * Load book documents for author aggregation. Prefer catalog /search (no tenant filter on query),
 * same family as homepage search modes; fall back to /products if search returns nothing.
 */
export async function fetchCatalogProductsForAuthorDirectory() {
  const merged = [];

  const pushPages = async (fetchPage) => {
    const r1 = await fetchPage({ limit: 100, page: 1 });
    let batch = extractProductItemsFromCatalogResponse(r1);
    merged.push(...batch);
    const total = Number(r1?.data?.total);
    if (batch.length === 100 && Number.isFinite(total) && total > 100) {
      const r2 = await fetchPage({ limit: 100, page: 2 });
      merged.push(...extractProductItemsFromCatalogResponse(r2));
    }
  };

  await pushPages(searchProducts);

  if (merged.length === 0) {
    await pushPages(getProducts);
  }

  return dedupeProductsById(merged);
}
