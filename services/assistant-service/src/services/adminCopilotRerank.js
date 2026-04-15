/**
 * Deterministic reranking for admin copilot: pick operational focus without ML.
 */

const REPLY_HELP_RE =
  /phản hồi sao|trả lời (thế nào|sao)|nên (viết|nói|trả lời) gì|cách trả lời|draft|mẫu (câu|tin)/i;
const ESCALATION_RE = /escalat|chuyển cấp|báo cấp trên|khiếu nại nặng|quản lý xem/i;
const FOLLOWUP_CONTINUATION_RE = /^(còn|vậy|còn gì|thêm|nữa|khác|tiếp|nữa không|sp nào|sản phẩm nào)/i;

const scoreHints = (text, hints) => {
  const t = String(text || "").toLowerCase();
  let s = 0;
  hints.forEach((h) => {
    if (t.includes(h)) s += 1;
  });
  return s;
};

const STOCK_HINTS = [
  "tồn kho",
  "ton kho",
  "hết hàng",
  "het hang",
  "sắp hết",
  "sap het",
  "stock",
  "kho",
  "còn bao nhiêu",
  "inventory",
  "sản phẩm",
  "sp ",
  "tồn ",
];

const SUPPORT_HINTS = [
  "giao hàng",
  "ship",
  "vận chuyển",
  "thanh toán",
  "hoàn tiền",
  "đổi trả",
  "khiếu nại",
  "đơn hàng",
  "chưa nhận",
  "mã đơn",
  "vận đơn",
  "đơn ",
];

/**
 * @returns {{ stock: number, support: number, rawLabel: "stock"|"support"|"balanced" }}
 */
const scoreFocusDimensions = (adminQuestion, conversationCompact, supportTags = []) => {
  const tagBlob = Array.isArray(supportTags) ? supportTags.join(" ").toLowerCase() : "";
  const q = `${adminQuestion || ""}\n${conversationCompact || ""}\n${tagBlob}`;
  const stock = scoreHints(q, STOCK_HINTS);
  let sup = scoreHints(q, SUPPORT_HINTS);
  if (tagBlob.includes("giao hàng") || tagBlob.includes("thanh toán") || tagBlob.includes("đổi trả")) {
    sup += 2;
  }
  let rawLabel = "balanced";
  if (stock > sup + 0.5) rawLabel = "stock";
  else if (sup > stock + 0.5) rawLabel = "support";
  return { stock, support: sup, rawLabel };
};

/**
 * @returns {"reply_help"|"escalation"|"ambiguous"}
 */
const classifyAdminIntent = (adminQuestion = "") => {
  const q = String(adminQuestion || "").trim();
  if (!q) return "ambiguous";
  if (REPLY_HELP_RE.test(q)) return "reply_help";
  if (ESCALATION_RE.test(q)) return "escalation";
  return "ambiguous";
};

const isWeakSignal = (dims) => {
  const { stock, support } = dims;
  return Math.abs(stock - support) <= 1.5 && Math.max(stock, support) < 3;
};

const isShortQuestion = (q) => String(q || "").trim().length < 72;

const looksLikeContinuation = (adminQuestion) => {
  const q = String(adminQuestion || "").trim().toLowerCase();
  if (!q) return false;
  if (FOLLOWUP_CONTINUATION_RE.test(q)) return true;
  if (/\b(còn|khác|nữa|tiếp|thêm)\b/.test(q) && q.length < 60) return true;
  return false;
};

/**
 * @param {{ dims: object, rawLabel: string, adminIntent: string, memory: object|null, adminQuestion: string }}
 * @returns {{ effectiveFocus: "stock"|"support"|"balanced", intentMode: "normal"|"reply_help"|"escalation", rerankReason: string }}
 */
const resolveEffectiveFocus = ({
  dims,
  rawLabel,
  adminIntent,
  memory,
  adminQuestion,
}) => {
  const memFocus = memory && memory.lastFocus ? memory.lastFocus : null;

  if (adminIntent === "reply_help") {
    return {
      effectiveFocus: "support",
      intentMode: "reply_help",
      rerankReason: "intent:reply_help → ưu tiên hội thoại & mẫu phản hồi",
    };
  }

  if (adminIntent === "escalation") {
    const ef = memFocus === "stock" ? "balanced" : "support";
    return {
      effectiveFocus: ef,
      intentMode: "escalation",
      rerankReason: "intent:escalation → giữ ngữ cảnh phiếu + quy trình escalate",
    };
  }

  const qOnlyDims = scoreFocusDimensions(adminQuestion, "", []);
  const topicSwitchToSupport =
    memFocus === "stock" && dims.support >= dims.stock + 2 && qOnlyDims.support >= 2;
  const topicSwitchToStock =
    memFocus === "support" && dims.stock >= dims.support + 2 && qOnlyDims.stock >= 2;

  if (topicSwitchToSupport) {
    return {
      effectiveFocus: "support",
      intentMode: "normal",
      rerankReason: "topic_switch: tín hiệu đơn hàng/CSKH mạnh hơn tồn kho",
    };
  }
  if (topicSwitchToStock) {
    return {
      effectiveFocus: "stock",
      intentMode: "normal",
      rerankReason: "topic_switch: tín hiệu tồn kho/sản phẩm mạnh hơn hỗ trợ",
    };
  }

  if (memFocus && isWeakSignal(dims) && (isShortQuestion(adminQuestion) || looksLikeContinuation(adminQuestion))) {
    return {
      effectiveFocus: memFocus === "balanced" ? rawLabel : memFocus,
      intentMode: "normal",
      rerankReason: `memory: tiếp tục trọng tâm «${memFocus}» (câu ngắn / tiếp nối)`,
    };
  }

  if (looksLikeContinuation(adminQuestion) && memFocus && (memFocus === "stock" || memFocus === "support")) {
    return {
      effectiveFocus: memFocus,
      intentMode: "normal",
      rerankReason: `memory: câu tiếp nối → giữ «${memFocus}»`,
    };
  }

  return {
    effectiveFocus: rawLabel,
    intentMode: "normal",
    rerankReason: "scores: theo điểm khớp ngữ cảnh hiện tại",
  };
};

module.exports = {
  scoreFocusDimensions,
  classifyAdminIntent,
  resolveEffectiveFocus,
  isWeakSignal,
  looksLikeContinuation,
};
