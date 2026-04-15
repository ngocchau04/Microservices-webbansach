/**
 * Maps internal checkout order status codes (API / DB) to consistent Vietnamese labels.
 * Internal values stay in English; only display strings are localized here.
 */

export const ORDER_STATUS_LABELS = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang vận chuyển",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  return_requested: "Yêu cầu hoàn trả",
  return_processing: "Đang xử lý hoàn trả",
  return_accepted: "Chấp nhận hoàn trả",
  return_rejected: "Từ chối hoàn trả",
  returned: "Đã hoàn trả",
};

/**
 * @param {string|null|undefined} status - raw status from API (e.g. order.orderStatus)
 * @returns {string} Vietnamese label, or original string if unknown
 */
export function getOrderStatusLabel(status) {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!key) {
    return "";
  }
  return ORDER_STATUS_LABELS[key] ?? String(status).trim();
}

/** CSS modifier for `.order-status-badge--${modifier}` (matches known internal codes). */
export function getOrderStatusBadgeModifier(status) {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  if (ORDER_STATUS_LABELS[key]) {
    return key;
  }
  return "unknown";
}

/** Whether the order is in any return / refund workflow state (for dedicated UI blocks). */
export function isReturnFlowStatus(status) {
  const k = String(status ?? "")
    .trim()
    .toLowerCase();
  return (
    k === "return_requested" ||
    k === "return_processing" ||
    k === "return_accepted" ||
    k === "return_rejected" ||
    k === "returned"
  );
}
