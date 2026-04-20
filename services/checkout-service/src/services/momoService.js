const crypto = require("crypto");

const DEFAULT_MOMO_URL = "https://test-payment.momo.vn/v2/gateway/api/create";

const hmacSha256 = (secret, raw) =>
  crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");

const buildCreateSignaturePayload = ({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
}) =>
  [
    ["accessKey", accessKey],
    ["amount", amount],
    ["extraData", extraData],
    ["ipnUrl", ipnUrl],
    ["orderId", orderId],
    ["orderInfo", orderInfo],
    ["partnerCode", partnerCode],
    ["redirectUrl", redirectUrl],
    ["requestId", requestId],
    ["requestType", requestType],
  ]
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

const buildCallbackSignaturePayload = (params) =>
  [
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
  ]
    .map((value) => value ?? "")
    .join("|");

const buildReturnUrl = (config) => `${config.apiBaseUrl}${config.momoReturnPath}`;
const buildIpnUrl = (config) => `${config.apiBaseUrl}${config.momoIpnPath}`;

const encodeExtraData = (transaction) => String(transaction?._id || "");

const decodeExtraData = (value) => {
  if (!value) return null;

  if (/^[a-f0-9]{24}$/i.test(String(value))) {
    return {
      paymentId: String(value),
    };
  }

  try {
    return JSON.parse(Buffer.from(String(value), "base64").toString("utf8"));
  } catch (_error) {
    return {
      paymentId: String(value),
    };
  }
};

const buildMomoOrderId = ({ order, transaction }) => `MOMO-${order._id}-${transaction._id}`;
const buildMomoRequestId = ({ transaction }) => `MOMO-${transaction._id}-${Date.now()}`;

const createPaymentUrl = async ({ transaction, order, config }) => {
  if (!config.momoPartnerCode || !config.momoAccessKey || !config.momoSecretKey) {
    throw new Error("MoMo credentials are not configured");
  }

  const orderId = buildMomoOrderId({ order, transaction });
  const requestId = buildMomoRequestId({ transaction });
  const amount = Math.round(Number(transaction.amount || 0));
  const orderInfo = `Thanh toan don hang ${order._id}`;
  const requestType = config.momoRequestType || "captureWallet";
  const redirectUrl = buildReturnUrl(config);
  const ipnUrl = buildIpnUrl(config);
  const extraData = encodeExtraData(transaction);

  const rawSignature = buildCreateSignaturePayload({
    accessKey: config.momoAccessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode: config.momoPartnerCode,
    redirectUrl,
    requestId,
    requestType,
  });

  const payload = {
    partnerCode: config.momoPartnerCode,
    partnerName: config.momoPartnerName || "Bookstore",
    storeId: config.momoStoreId || "Bookstore",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: "vi",
    requestType,
    autoCapture: true,
    extraData,
    signature: hmacSha256(config.momoSecretKey, rawSignature),
  };

  const response = await fetch(config.momoApiUrl || DEFAULT_MOMO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.message || `MoMo API call failed with status ${response.status}`);
  }

  if (String(body?.resultCode) !== "0") {
    throw new Error(body?.message || "MoMo payment creation failed");
  }

  const checkoutUrl = body?.payUrl || body?.deeplink || body?.qrCodeUrl;
  if (!checkoutUrl) {
    throw new Error("MoMo checkout URL not returned");
  }

  return {
    checkoutUrl,
    orderId,
    requestId,
    extraData,
    responsePayload: body,
  };
};

const verifyCallback = ({ params, config }) => {
  const receivedSignature = String(params?.signature || "").trim();
  if (!receivedSignature || !config.momoSecretKey) {
    return false;
  }

  const rawSignature = buildCallbackSignaturePayload(params);
  const expectedSignature = hmacSha256(config.momoSecretKey, rawSignature);
  return expectedSignature.toLowerCase() === receivedSignature.toLowerCase();
};

const isSuccessResponse = (params) =>
  String(params?.errorCode ?? params?.resultCode ?? "") === "0";

module.exports = {
  buildReturnUrl,
  buildIpnUrl,
  buildMomoOrderId,
  buildMomoRequestId,
  createPaymentUrl,
  decodeExtraData,
  verifyCallback,
  isSuccessResponse,
};
