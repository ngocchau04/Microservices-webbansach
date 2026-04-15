const SECTION_KEYS = ["Tóm tắt", "Hướng xử lý", "Câu trả lời gợi ý", "Cảnh báo liên quan"];

const cleanText = (value) => String(value || "").replace(/\r/g, "").trim();

/** Short operator prompt; heavy context goes in context.adminCopilot for assistant-service. */
export const DEFAULT_ADMIN_COPILOT_MESSAGE =
  "Gợi ý xử lý nhanh theo phiếu hỗ trợ và dữ liệu vận hành hiện tại.";

export const createDefaultSections = () => ({
  "Tóm tắt": "Chưa có dữ liệu hội thoại để tóm tắt.",
  "Hướng xử lý": "Chọn hội thoại để nhận hướng xử lý cụ thể.",
  "Câu trả lời gợi ý": "Sử dụng các mẫu trả lời nhanh ở panel bên trái.",
  "Cảnh báo liên quan": "Không có cảnh báo vận hành nổi bật.",
});

/**
 * Structured payload for assistant-service admin_copilot mode (not a giant free-text prompt).
 */
export const buildAdminCopilotContextPayload = ({
  conversationText = "",
  ticketId = "",
  conversationStatus = "open",
  supportTags = [],
  escalationTitle = "",
  escalationLevel = "low",
  inventorySummary = {},
  copilotSessionId = "",
}) => ({
  mode: "admin_copilot",
  conversationCompact: cleanText(conversationText).slice(0, 2000),
  ticketId: String(ticketId || ""),
  copilotSessionId: String(copilotSessionId || ""),
  supportStatus: String(conversationStatus || ""),
  supportTags: Array.isArray(supportTags) ? supportTags : [],
  escalationTitle: String(escalationTitle || ""),
  escalationLevel: String(escalationLevel || "low").toLowerCase(),
  inventorySummary: inventorySummary && typeof inventorySummary === "object" ? inventorySummary : {},
});

const getSectionMatcher = (key) =>
  new RegExp(`(?:^|\\n)\\s*${key}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${SECTION_KEYS.join("|")})\\s*:|$)`, "i");

export const parseAdminCopilotSections = (rawText = "") => {
  const fallback = createDefaultSections();
  const text = cleanText(rawText);
  if (!text) {
    return fallback;
  }

  const parsed = {};
  SECTION_KEYS.forEach((key) => {
    const match = text.match(getSectionMatcher(key));
    parsed[key] = cleanText(match?.[1]);
  });

  const hasAnyStructured = SECTION_KEYS.some((key) => parsed[key]);
  if (!hasAnyStructured) {
    return {
      ...fallback,
      "Tóm tắt": text,
    };
  }

  return SECTION_KEYS.reduce((acc, key) => {
    acc[key] = parsed[key] || fallback[key];
    return acc;
  }, {});
};
