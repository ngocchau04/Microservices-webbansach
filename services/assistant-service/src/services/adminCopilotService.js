/**
 * Isolated admin support copilot mode — deterministic, support-operator focused.
 * Does not use catalog retrieval / book intents; keeps customer /chat behavior separate.
 */

const { getAdminCopilotMemory, setAdminCopilotMemory } = require("./adminCopilotMemory");
const {
  scoreFocusDimensions,
  classifyAdminIntent,
  resolveEffectiveFocus,
} = require("./adminCopilotRerank");

const compactSnippet = (text, maxLen = 900) => {
  const s = String(text || "").replace(/\r/g, "").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
};

const extractUserSnippets = (conversationCompact) => {
  const lines = String(conversationCompact || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const userLines = lines
    .filter((l) => /^user\s*:/i.test(l))
    .map((l) => l.replace(/^user\s*:\s*/i, "").trim())
    .filter(Boolean);
  const pick = userLines.slice(-3);
  if (pick.length) return pick.join(" · ");
  const fallback = lines.slice(-2).join(" ");
  return fallback || "Chưa có đoạn hội thoại khách rõ ràng trong ngữ cảnh gửi lên.";
};

const formatInventoryLine = (inv) => {
  if (!inv || typeof inv !== "object") return "Không có số liệu tồn kho kèm theo.";
  const out = Number(inv.outOfStock);
  const low = Number(inv.lowStock);
  const norm = Number(inv.normalStock);
  const alerts = Array.isArray(inv.alerts) ? inv.alerts.slice(0, 4) : [];
  const alertStr = alerts.length
    ? alerts
        .map((a) => {
          const st = a.status === "out" ? "hết hàng" : `còn ${a.stock}`;
          return `${a.title || "SP"} (${st})`;
        })
        .join("; ")
    : "Không có mục cảnh báo chi tiết.";
  return `Hết hàng: ${Number.isFinite(out) ? out : 0}; Sắp hết (1–4): ${Number.isFinite(low) ? low : 0}; Bình thường: ${Number.isFinite(norm) ? norm : 0}. Chi tiết: ${alertStr}`;
};

const buildEscalationBullet = (level, title) => {
  const lv = String(level || "low").toLowerCase();
  const t = String(title || "").trim();
  if (lv === "high") {
    return `- Ưu tiên escalate: ${t || "Rủi ro cao — cần quản lý hỗ trợ hoặc tài chính."}`;
  }
  if (lv === "medium") {
    return `- Cân nhắc escalate chuyên trách: ${t || "Phối hợp vận hành / CSKH chuyên sâu."}`;
  }
  return `- Chưa bắt buộc escalate: ${t || "Có thể xử lý tại tuyến hiện tại nếu đủ thông tin."}`;
};

const buildDirections = (focus, escalationLevel, intentMode) => {
  const esc = String(escalationLevel || "low").toLowerCase();
  if (intentMode === "reply_help") {
    return [
      "- Đọc lại 2–3 tin gần nhất của khách; trả lời đúng trọng tâm (đơn / thanh toán / giao nhận) đã nêu.",
      "- Giữ giọng nhất quán với chính sách đã công bố; tránh cam kết ngoài quy trình.",
      "- Nếu thiếu mã đơn hoặc bằng chứng: xin khách bổ sung trước khi kết luận.",
      ...(esc !== "low" ? [buildEscalationBullet(esc, "")] : []),
    ].join("\n");
  }
  if (intentMode === "escalation") {
    return [
      "- Ghi nhận mức độ: không tự cam kết bồi hoàn ngoài thẩm quyền; chuyển cấp theo quy định.",
      "- Tóm tắt nội bộ: thời điểm sự việc + bằng chứng khách đã gửi + hành động đã làm.",
      "- Phản hồi khách: đã chuyển xử lý cấp trên, thời gian phản hồi dự kiến (nếu có).",
      ...(esc !== "low" ? [buildEscalationBullet(esc, "")] : []),
    ].join("\n");
  }
  if (focus === "stock") {
    return [
      "- Ưu tiên đối chiếu mã sản phẩm / tên sách khách nhắc với bảng tồn kho trong admin.",
      "- Với hết hàng: kiểm tra thời gian nhập kho dự kiến hoặc tạm ẩn / thông báo lại khách.",
      "- Với sắp hết: cân nhắc giới hạn bán hoặc thông báo giao chậm nếu còn ít.",
      ...(esc !== "low" ? [buildEscalationBullet(esc, "")] : []),
    ].join("\n");
  }
  if (focus === "support") {
    return [
      "- Ưu tiên xác thực mã đơn / email khách và trạng thái giao hàng trên hệ thống đơn hàng.",
      "- Thu thập bằng chứng (ảnh, mã giao dịch) nếu liên quan thanh toán hoặc đổi trả.",
      "- Phản hồi khách theo khung thời gian đã cam kết; ghi chú nội bộ nếu cần bàn giao ca.",
      ...(esc !== "low" ? [buildEscalationBullet(esc, "")] : []),
    ].join("\n");
  }
  return [
    "- Kết hợp kiểm tra phiếu hỗ trợ + tồn kho nếu khách nhắn đến sản phẩm cụ thể.",
    "- Nếu vấn đề chỉ vận hành đơn hàng: ưu tiên tra cứu đơn; nếu chỉ kho: ưu tiên tra SKU.",
    ...(esc !== "low" ? [buildEscalationBullet(esc, "")] : []),
  ].join("\n");
};

const buildSuggestedReply = (focus, userVoice, intentMode) => {
  const short = compactSnippet(userVoice, 200);
  if (intentMode === "reply_help") {
    return `- "Dựa trên nội dung khách vừa gửi, mình đề xuất: xác nhận đã nhận phản ánh, nêu bước kiểm tra cụ thể, và thời điểm cập nhật tiếp theo — tránh hứa mức bồi thường khi chưa đối soát." (Bối cảnh: ${short})`;
  }
  if (focus === "stock") {
    return `- "Bookie đang kiểm tra tồn kho đầu sách bạn nhắc. Mình sẽ xác nhận lại có thể giao ngay hay cần chờ nhập thêm và phản hồi bạn ngay sau khi có số liệu." (Bối cảnh khách: ${short})`;
  }
  if (focus === "support") {
    return `- "Mình đã ghi nhận tình trạng và đang kiểm tra đơn / thanh toán trên hệ thống. Bạn giữ giúp mã đơn hoặc email đặt hàng để mình đối soát nhanh nhất." (Tóm tắt khách: ${short})`;
  }
  return `- "Mình đã tiếp nhận yêu cầu và đang phối hợp bộ phận liên quan để xử lý. Bạn cho mình thêm mã đơn hoặc tên sách nếu có để mình hỗ trợ chính xác hơn." (${short})`;
};

const buildWarnings = (focus, inventoryLine, escalationLevel, escalationTitle, intentMode) => {
  const lines = [];
  if (intentMode === "escalation") {
    lines.push(`- Escalate / rủi ro: ${escalationTitle || "Theo quy trình cấp trên — không cam kết ngoài thẩm quyền."}`);
  }
  if (focus === "stock" || focus === "balanced") {
    lines.push(`- Tồn kho (ưu tiên khi hỏi hàng): ${inventoryLine}`);
  }
  if (focus === "support" || focus === "balanced") {
    lines.push(
      `- Vận hành hỗ trợ: kiểm tra trùng ticket / trùng khiếu nại trước khi cam kết hoàn tiền.`
    );
  }
  const esc = String(escalationLevel || "low").toLowerCase();
  if ((esc === "high" || esc === "medium") && intentMode !== "escalation") {
    lines.push(`- Escalate: ${escalationTitle || "Theo cấp — không tự cam kết ngoài quy trình."}`);
  }
  return lines.join("\n");
};

/**
 * Backwards-compatible with older tests
 */
const classifyFocus = (adminQuestion, conversationCompact, supportTags = []) =>
  scoreFocusDimensions(adminQuestion, conversationCompact, supportTags).rawLabel;

/**
 * @param {{ message: string, context: object, tenantId: string }} params
 */
const buildAdminCopilotChatResult = ({ message, context = {}, tenantId = "public" }) => {
  const ac = context.adminCopilot && typeof context.adminCopilot === "object" ? context.adminCopilot : {};
  const conversationCompact = compactSnippet(ac.conversationCompact || ac.conversationText || "", 1400);
  const adminQuestion = String(message || "").trim() || "Gợi ý xử lý nhanh theo phiếu hỗ trợ hiện tại.";
  const supportTags = Array.isArray(ac.supportTags) ? ac.supportTags : [];
  const escalationTitle = String(ac.escalationTitle || "").trim();
  const escalationLevel = String(ac.escalationLevel || "low").toLowerCase();
  const ticketId = String(ac.ticketId || context.supportConversationId || "").trim();
  const supportStatus = String(ac.supportStatus || context.supportStatus || "").trim();
  const copilotSessionId = String(ac.copilotSessionId || "").trim();

  const dims = scoreFocusDimensions(adminQuestion, conversationCompact, supportTags);
  let rawLabel = dims.rawLabel;
  const invSummary = ac.inventorySummary && typeof ac.inventorySummary === "object" ? ac.inventorySummary : {};
  const hasStockPressure =
    Number(invSummary.outOfStock) > 0 || Number(invSummary.lowStock) > 0;
  if (/gợi ý xử lý nhanh theo phiếu/i.test(adminQuestion) && hasStockPressure && rawLabel === "balanced") {
    rawLabel = "stock";
  }
  const adminIntent = classifyAdminIntent(adminQuestion);
  const memory = getAdminCopilotMemory(tenantId, ticketId, copilotSessionId);

  const { effectiveFocus, intentMode, rerankReason } = resolveEffectiveFocus({
    dims,
    rawLabel,
    adminIntent,
    memory,
    adminQuestion,
  });

  const userVoice = extractUserSnippets(conversationCompact);
  const inventoryLine = formatInventoryLine(ac.inventorySummary);

  const memoryHint = memory
    ? `Có bộ nhớ ngắn hạn (${memory.recentAdminQuestions?.length || 0} câu admin gần nhất).`
    : "Chưa có bộ nhớ phiên (lượt đầu hoặc hết hạn).";
  const recentQ = memory?.recentAdminQuestions?.length
    ? `Câu admin trước: ${memory.recentAdminQuestions.slice(-2).join(" → ")}`
    : "";

  const summary = [
    `- Phiếu: ${ticketId || "N/A"} · Trạng thái: ${supportStatus || "N/A"} · Tenant: ${tenantId}`,
    `- Nội dung chính từ khách (trích): ${userVoice}`,
    `- Trọng tâm sau rerank: ${effectiveFocus === "stock" ? "Tồn kho / sản phẩm" : effectiveFocus === "support" ? "Vận hành đơn / CSKH" : "Cân bằng kho + hỗ trợ"} (${rerankReason})`,
    `- ${memoryHint}${recentQ ? ` · ${recentQ}` : ""}`,
  ].join("\n");

  const directions = buildDirections(effectiveFocus, escalationLevel, intentMode);
  const suggested = buildSuggestedReply(effectiveFocus, userVoice, intentMode);
  const warnings = buildWarnings(
    effectiveFocus,
    inventoryLine,
    escalationLevel,
    escalationTitle,
    intentMode
  );

  const mainAnswer = [
    "Tóm tắt:",
    summary,
    "",
    "Hướng xử lý:",
    directions,
    "",
    "Câu trả lời gợi ý:",
    suggested,
    "",
    "Cảnh báo liên quan:",
    warnings,
  ].join("\n");

  setAdminCopilotMemory(tenantId, ticketId, copilotSessionId, {
    lastFocus: effectiveFocus,
    escalationLevel,
    adminQuestion,
  });

  return {
    mainAnswer,
    whyExplanation: null,
    followUpChips: [],
    sources: [],
    recommendations: [],
    sessionHints: {},
    graphReasoningInfo: {
      pathsUsed: [
        {
          op: "admin_copilot",
          focus: effectiveFocus,
          ticketId: ticketId || null,
          rerank: rerankReason,
          intentMode,
          memory: !!memory,
        },
      ],
      focusEntity: ticketId ? `support_ticket:${ticketId}` : null,
      adminCopilot: true,
    },
    handoff: null,
    fallback: false,
    message: mainAnswer,
  };
};

const isAdminCopilotContext = (context = {}) => {
  const mode = String(context.supportMode || context.adminCopilotMode || "").toLowerCase();
  if (mode === "admin_copilot") return true;
  const ac = context.adminCopilot;
  if (ac && typeof ac === "object" && String(ac.mode || "").toLowerCase() === "admin_copilot") {
    return true;
  }
  return false;
};

module.exports = {
  buildAdminCopilotChatResult,
  isAdminCopilotContext,
  classifyFocus,
  compactSnippet,
  extractUserSnippets,
};
