/** Pure helpers for checkout voucher gating (unit-tested). */

export const VOUCHER_INVALID_MESSAGE = "Voucher đã hết hoặc không tồn tại !";

export const normalizeVoucherCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

/**
 * True when the user must not place an order: non-empty voucher input that is not
 * the same as the last successfully applied voucher code.
 */
export function isVoucherInputBlockingCheckout({ voucherInput, appliedVoucher }) {
  const trimmed = String(voucherInput ?? "").trim();
  if (!trimmed) {
    return false;
  }
  if (!appliedVoucher?.code) {
    return true;
  }
  return normalizeVoucherCode(trimmed) !== normalizeVoucherCode(appliedVoucher.code);
}
