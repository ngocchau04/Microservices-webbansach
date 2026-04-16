import test from "node:test";
import assert from "node:assert/strict";
import { resolveProductImageSrc, PRODUCT_IMAGE_PLACEHOLDER } from "./productImage.js";

test("resolveProductImageSrc uses placeholder when empty", () => {
  assert.equal(resolveProductImageSrc(""), PRODUCT_IMAGE_PLACEHOLDER);
  assert.equal(resolveProductImageSrc("   "), PRODUCT_IMAGE_PLACEHOLDER);
  assert.equal(resolveProductImageSrc(undefined), PRODUCT_IMAGE_PLACEHOLDER);
});

test("resolveProductImageSrc keeps non-empty URLs", () => {
  assert.equal(resolveProductImageSrc("https://example.com/book.jpg"), "https://example.com/book.jpg");
});
