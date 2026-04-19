const crypto = require("crypto");
const {
  buildMomoOrderId,
  buildMomoRequestId,
  decodeExtraData,
  verifyCallback,
  isSuccessResponse,
} = require("../src/services/momoService");

describe("momoService", () => {
  const config = {
    momoAccessKey: "access123",
    momoSecretKey: "secret123",
  };

  test("buildMomoOrderId creates stable readable ids", () => {
    const orderId = buildMomoOrderId({
      order: { _id: "order123" },
      transaction: { _id: "txn456" },
    });

    expect(orderId).toBe("MOMO-order123-txn456");
  });

  test("buildMomoRequestId includes transaction id", () => {
    const requestId = buildMomoRequestId({
      transaction: { _id: "txn456" },
    });

    expect(requestId).toContain("MOMO-txn456-");
  });

  test("decodeExtraData returns parsed JSON payload", () => {
    const encoded = Buffer.from(
      JSON.stringify({ paymentId: "pay1", orderId: "order1" }),
      "utf8"
    ).toString("base64");

    expect(decodeExtraData(encoded)).toEqual({
      paymentId: "pay1",
      orderId: "order1",
    });
  });

  test("decodeExtraData supports plain payment id like grocery app", () => {
    expect(decodeExtraData("507f1f77bcf86cd799439011")).toEqual({
      paymentId: "507f1f77bcf86cd799439011",
    });
  });

  test("verifyCallback accepts valid MoMo signature", () => {
    const params = {
      partnerCode: "MOMO",
      orderId: "ORDER100-P507f1f77bcf86cd799439011",
      requestId: "1713538170099",
      amount: "150000",
      errorCode: "0",
      transId: "4088878653",
      message: "Successful.",
      localMessage: "Thanh cong.",
      responseTime: "1721720663942",
      payType: "qr",
      extraData: "507f1f77bcf86cd799439011",
    };

    const raw = [
      params.partnerCode,
      params.orderId,
      params.requestId,
      params.amount,
      params.errorCode,
      params.transId,
      params.message,
      params.localMessage,
      params.responseTime,
      params.payType,
      params.extraData,
    ].join("|");

    params.signature = crypto.createHmac("sha256", config.momoSecretKey).update(raw, "utf8").digest("hex");

    expect(verifyCallback({ params, config })).toBe(true);
  });

  test("isSuccessResponse accepts either errorCode or resultCode 0", () => {
    expect(isSuccessResponse({ errorCode: 0 })).toBe(true);
    expect(isSuccessResponse({ resultCode: 0 })).toBe(true);
    expect(isSuccessResponse({ errorCode: 1006 })).toBe(false);
  });
});
