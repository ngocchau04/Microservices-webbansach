const {
  createPaymentUrl,
  verifyCallback,
  isSuccessResponse,
} = require("../src/services/vnpayService");

describe("vnpayService", () => {
  const config = {
    vnpayTmnCode: "TESTCODE",
    vnpaySecretKey: "secret123",
    vnpayUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    apiBaseUrl: "http://localhost:8080",
    vnpayReturnPath: "/api/checkout/payments/vnpay/return",
  };

  const transaction = {
    _id: "txn_123",
    amount: 150000,
  };

  const order = {
    _id: "order_456",
  };

  test("createPaymentUrl returns signed VNPay URL", () => {
    const url = createPaymentUrl({ transaction, order, config, ipAddress: "127.0.0.1" });
    expect(url).toContain(config.vnpayUrl);
    expect(url).toContain("vnp_TmnCode=TESTCODE");
    expect(url).toContain("vnp_TxnRef=txn_123");
    expect(url).toContain("vnp_SecureHash=");
  });

  test("verifyCallback accepts params signed by createPaymentUrl", () => {
    const url = createPaymentUrl({ transaction, order, config, ipAddress: "127.0.0.1" });
    const parsed = new URL(url);
    const params = Object.fromEntries(parsed.searchParams.entries());
    expect(verifyCallback({ params, config })).toBe(true);
  });

  test("isSuccessResponse only accepts successful VNPay status", () => {
    expect(
      isSuccessResponse({
        vnp_ResponseCode: "00",
        vnp_TransactionStatus: "00",
      })
    ).toBe(true);

    expect(
      isSuccessResponse({
        vnp_ResponseCode: "24",
        vnp_TransactionStatus: "02",
      })
    ).toBe(false);
  });

  test("verifyCallback returns false when a param is tampered after signing", () => {
    const url = createPaymentUrl({ transaction, order, config, ipAddress: "127.0.0.1" });
    const params = Object.fromEntries(new URL(url).searchParams.entries());
    params.vnp_Amount = "999999999";
    expect(verifyCallback({ params, config })).toBe(false);
  });

  test("verifyCallback returns false when secure hash is replaced with garbage", () => {
    const url = createPaymentUrl({ transaction, order, config, ipAddress: "127.0.0.1" });
    const params = Object.fromEntries(new URL(url).searchParams.entries());
    params.vnp_SecureHash = "a".repeat(128);
    expect(verifyCallback({ params, config })).toBe(false);
  });
});
