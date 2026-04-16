/**
 * Surgical removal of known test products mistakenly inserted via admin API
 * (not part of the intended 5-book seed dataset).
 */
const REMOVABLE_DEBUG_PRODUCT_TITLES = ["Debug Cart Stock", "Debug Cart Stock 2"];

const removeDebugProducts = async (Product) => {
  const result = await Product.deleteMany({
    title: { $in: REMOVABLE_DEBUG_PRODUCT_TITLES },
  });
  return result.deletedCount;
};

module.exports = {
  REMOVABLE_DEBUG_PRODUCT_TITLES,
  removeDebugProducts,
};
