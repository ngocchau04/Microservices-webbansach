jest.mock("../src/services/voucherService", () => ({
  resolveApplicableVoucher: jest.fn(),
  incrementVoucherUsage: jest.fn(),
}));

const voucherService = require("../src/services/voucherService");
const { resolveTotals } = require("../src/services/orderService");

describe("orderService.resolveTotals — voucher enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("allows order when no voucher code is sent", async () => {
    const result = await resolveTotals({
      items: [{ price: 100000, quantity: 1 }],
      payload: {},
      cart: null,
    });

    expect(result.ok).toBe(true);
    expect(result.data.discount).toBe(0);
    expect(result.data.voucherInfo.code).toBeNull();
    expect(voucherService.resolveApplicableVoucher).not.toHaveBeenCalled();
  });

  test("applies discount when voucher resolves successfully", async () => {
    voucherService.resolveApplicableVoucher.mockResolvedValue({
      ok: true,
      statusCode: 200,
      data: {
        voucher: { code: "SAVE", type: "fixed", value: 5000 },
        discount: 5000,
      },
    });

    const result = await resolveTotals({
      items: [{ price: 100000, quantity: 1 }],
      payload: { voucherCode: "SAVE" },
      cart: null,
    });

    expect(result.ok).toBe(true);
    expect(result.data.voucherInfo.code).toBe("SAVE");
    expect(result.data.discount).toBe(5000);
  });

  test("rejects when voucher code is present but not applicable (defense in depth)", async () => {
    voucherService.resolveApplicableVoucher.mockResolvedValue({
      ok: false,
      statusCode: 404,
      code: "CHECKOUT_VOUCHER_NOT_FOUND",
      message: "Voucher not found",
    });

    const result = await resolveTotals({
      items: [{ price: 100000, quantity: 1 }],
      payload: { voucherCode: "NOCODE" },
      cart: null,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Voucher đã hết hoặc không tồn tại !");
    expect(result.code).toBe("CHECKOUT_VOUCHER_NOT_FOUND");
  });

  test("rejects expired or exhausted voucher with same user-facing message", async () => {
    voucherService.resolveApplicableVoucher.mockResolvedValue({
      ok: false,
      statusCode: 400,
      code: "CHECKOUT_VOUCHER_INACTIVE",
      message: "Voucher is inactive or expired",
    });

    const result = await resolveTotals({
      items: [{ price: 100000, quantity: 1 }],
      payload: { voucherCode: "OLD" },
      cart: null,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Voucher đã hết hoặc không tồn tại !");
  });
});
