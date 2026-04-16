import React, { useEffect, useState } from "react";
import { PRODUCT_IMAGE_PLACEHOLDER, resolveProductImageSrc } from "../utils/productImage";

/**
 * Product list / cart cover: resolves empty src and falls back on load error.
 * Keeps existing layout/CSS (same <img>, optional className).
 */
export default function ProductCardImage({ src, alt, className }) {
  const [url, setUrl] = useState(() => resolveProductImageSrc(src));

  useEffect(() => {
    setUrl(resolveProductImageSrc(src));
  }, [src]);

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        if (url !== PRODUCT_IMAGE_PLACEHOLDER) {
          setUrl(PRODUCT_IMAGE_PLACEHOLDER);
        }
      }}
    />
  );
}
