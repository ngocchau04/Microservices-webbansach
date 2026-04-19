const crypto = require("crypto");

const sortObject = (input) =>
  Object.keys(input)
    .sort()
    .reduce((acc, key) => {
      const value = input[key];
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {});

const encodeValue = (value) =>
  encodeURIComponent(String(value)).replace(/%20/g, "+");

const buildQueryString = (params) =>
  Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeValue(value)}`)
    .join("&");

const hmacSha512 = (secret, raw) =>
  crypto.createHmac("sha512", secret).update(raw, "utf8").digest("hex");

const getReturnUrl = (config) => `${config.apiBaseUrl}${config.vnpayReturnPath}`;

const createPaymentUrl = ({ transaction, order, config, ipAddress = "127.0.0.1" }) => {
  if (!config.vnpayTmnCode || !config.vnpaySecretKey) {
    throw new Error("VNPay credentials are not configured");
  }

  const createdAt = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const createDate = [
    createdAt.getFullYear(),
    pad(createdAt.getMonth() + 1),
    pad(createdAt.getDate()),
    pad(createdAt.getHours()),
    pad(createdAt.getMinutes()),
    pad(createdAt.getSeconds()),
  ].join("");

  const params = sortObject({
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.vnpayTmnCode,
    vnp_Amount: Math.round(Number(transaction.amount || 0) * 100),
    vnp_CreateDate: createDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddress,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: getReturnUrl(config),
    vnp_TxnRef: String(transaction._id),
  });

  const raw = buildQueryString(params);
  const secureHash = hmacSha512(config.vnpaySecretKey, raw);
  return `${config.vnpayUrl}?${raw}&vnp_SecureHash=${secureHash}`;
};

const verifyCallback = ({ params, config }) => {
  const receivedHash = String(params.vnp_SecureHash || "").trim();
  if (!receivedHash || !config.vnpaySecretKey) {
    return false;
  }

  const normalized = { ...params };
  delete normalized.vnp_SecureHash;
  delete normalized.vnp_SecureHashType;

  const sorted = sortObject(normalized);
  const raw = buildQueryString(sorted);
  const expected = hmacSha512(config.vnpaySecretKey, raw);
  return expected.toLowerCase() === receivedHash.toLowerCase();
};

const isSuccessResponse = (params) =>
  String(params.vnp_ResponseCode || "") === "00" &&
  String(params.vnp_TransactionStatus || "00") === "00";

module.exports = {
  createPaymentUrl,
  verifyCallback,
  isSuccessResponse,
  getReturnUrl,
};
