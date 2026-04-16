/** Same fallback as legacy CardItem default cover — used when URL missing or fails to load */
export const PRODUCT_IMAGE_PLACEHOLDER =
  "https://cafebiz.cafebizcdn.vn/2019/3/12/photo-1-1552354590822522314238.jpg";

export function resolveProductImageSrc(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s || PRODUCT_IMAGE_PLACEHOLDER;
}
