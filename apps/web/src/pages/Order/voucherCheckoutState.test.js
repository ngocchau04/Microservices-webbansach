import test from "node:test";
import assert from "node:assert/strict";
import {
  isVoucherInputBlockingCheckout,
  normalizeVoucherCode,
  VOUCHER_INVALID_MESSAGE,
} from "./voucherCheckoutState.js";

test("normalizeVoucherCode uppercases and trims", () => {
  assert.equal(normalizeVoucherCode("  abc  "), "ABC");
});

test("empty input does not block checkout", () => {
  assert.equal(
    isVoucherInputBlockingCheckout({ voucherInput: "   ", appliedVoucher: null }),
    false
  );
});

test("non-empty input with no applied voucher blocks", () => {
  assert.equal(
    isVoucherInputBlockingCheckout({ voucherInput: "SALE", appliedVoucher: null }),
    true
  );
});

test("matching applied voucher does not block", () => {
  assert.equal(
    isVoucherInputBlockingCheckout({
      voucherInput: "sale10",
      appliedVoucher: { code: "SALE10", discount: 1000 },
    }),
    false
  );
});

test("changed input after apply blocks until cleared or re-applied", () => {
  assert.equal(
    isVoucherInputBlockingCheckout({
      voucherInput: "OTHER",
      appliedVoucher: { code: "SALE10", discount: 1000 },
    }),
    true
  );
});

test("exported invalid message is exact copy", () => {
  assert.equal(VOUCHER_INVALID_MESSAGE, "Voucher đã hết hoặc không tồn tại !");
});
