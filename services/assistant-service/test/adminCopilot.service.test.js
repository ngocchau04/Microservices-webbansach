const {
  buildAdminCopilotChatResult,
  isAdminCopilotContext,
  classifyFocus,
} = require("../src/services/adminCopilotService");
const { _resetAdminCopilotMemoryForTests } = require("../src/services/adminCopilotMemory");

describe("adminCopilotService", () => {
  beforeEach(() => {
    _resetAdminCopilotMemoryForTests();
  });
  test("isAdminCopilotContext is true only for admin copilot flags", () => {
    expect(isAdminCopilotContext({ supportMode: "admin_copilot" })).toBe(true);
    expect(isAdminCopilotContext({ adminCopilot: { mode: "admin_copilot" } })).toBe(true);
    expect(isAdminCopilotContext({})).toBe(false);
    expect(isAdminCopilotContext({ supportMode: "customer" })).toBe(false);
  });

  test("classifyFocus prioritizes stock when question mentions inventory", () => {
    expect(
      classifyFocus("Kiểm tra tồn kho và sách sắp hết", "user: hết hàng rồi", [])
    ).toBe("stock");
  });

  test("classifyFocus prioritizes support when shipping/payment dominates", () => {
    expect(
      classifyFocus("Đơn hàng chưa giao", "user: chưa nhận được hàng", ["Giao hàng"])
    ).toBe("support");
  });

  test("stock-focused result surfaces inventory in warnings and directions", () => {
    const { mainAnswer, graphReasoningInfo } = buildAdminCopilotChatResult({
      message: "Báo cáo nhanh tồn kho và sách sắp hết",
      context: {
        supportMode: "admin_copilot",
        adminCopilot: {
          mode: "admin_copilot",
          ticketId: "t1",
          supportStatus: "open",
          conversationCompact: "user: sách A còn không?\nuser: hết hàng rồi",
          supportTags: ["Sản phẩm"],
          escalationTitle: "Tiếp tục xử lý",
          escalationLevel: "low",
          inventorySummary: {
            outOfStock: 2,
            lowStock: 3,
            normalStock: 10,
            alerts: [{ title: "Sách X", status: "out", stock: 0 }],
          },
        },
      },
      tenantId: "public",
    });
    expect(mainAnswer).toMatch(/Tóm tắt:/);
    expect(mainAnswer).toMatch(/Hướng xử lý:/);
    expect(mainAnswer).toMatch(/Câu trả lời gợi ý:/);
    expect(mainAnswer).toMatch(/Cảnh báo liên quan:/);
    expect(mainAnswer).toMatch(/Hết hàng: 2/);
    expect(mainAnswer).toMatch(/tồn kho/i);
    expect(graphReasoningInfo.pathsUsed[0].op).toBe("admin_copilot");
    expect(graphReasoningInfo.pathsUsed[0].focus).toBe("stock");
  });

  test("support-focused result emphasizes order verification, not stock-only", () => {
    const { mainAnswer } = buildAdminCopilotChatResult({
      message: "Khách khiếu nại chưa nhận hàng",
      context: {
        supportMode: "admin_copilot",
        adminCopilot: {
          mode: "admin_copilot",
          ticketId: "t2",
          supportStatus: "in_progress",
          conversationCompact: "user: đơn #123 chưa tới",
          supportTags: ["Giao hàng"],
          escalationTitle: "Đề xuất escalate cấp chuyên trách",
          escalationLevel: "medium",
          inventorySummary: { outOfStock: 0, lowStock: 0, normalStock: 5, alerts: [] },
        },
      },
      tenantId: "public",
    });
    expect(mainAnswer).toMatch(/mã đơn|đơn hàng|giao hàng/i);
    expect(mainAnswer).toMatch(/Trọng tâm ưu tiên.*Vận hành đơn|hỗ trợ/i);
  });

  test("active conversation text is preferred in summary over unrelated noise", () => {
    const { mainAnswer } = buildAdminCopilotChatResult({
      message: "Gợi ý xử lý",
      context: {
        supportMode: "admin_copilot",
        adminCopilot: {
          conversationCompact:
            "system: chuyen tiep\nuser: em chua nhan duoc hang\nadmin: dang kiem tra",
          ticketId: "t3",
          supportTags: [],
          escalationLevel: "low",
          inventorySummary: {},
        },
      },
      tenantId: "public",
    });
    expect(mainAnswer).toMatch(/chua nhan duoc hang|chưa nhận được hàng/i);
  });

  test("follow-up short question keeps stock focus when memory says stock", () => {
    const ctxBase = {
      supportMode: "admin_copilot",
      adminCopilot: {
        mode: "admin_copilot",
        ticketId: "t-follow-stock",
        copilotSessionId: "sess-1",
        supportStatus: "open",
        conversationCompact: "user: hết hàng sách A",
        supportTags: ["Sản phẩm"],
        escalationLevel: "low",
        escalationTitle: "x",
        inventorySummary: {
          outOfStock: 1,
          lowStock: 2,
          normalStock: 0,
          alerts: [{ title: "A", status: "out", stock: 0 }],
        },
      },
    };
    buildAdminCopilotChatResult({
      message: "Kiểm tra tồn kho sách A",
      context: ctxBase,
      tenantId: "public",
    });
    const { mainAnswer, graphReasoningInfo } = buildAdminCopilotChatResult({
      message: "còn sản phẩm nào khác không?",
      context: ctxBase,
      tenantId: "public",
    });
    expect(graphReasoningInfo.pathsUsed[0].focus).toBe("stock");
    expect(mainAnswer).toMatch(/memory|tiếp nối|rerank/i);
  });

  test("clear topic switch from stock memory to support when new question is strong support", () => {
    const ctxBase = {
      supportMode: "admin_copilot",
      adminCopilot: {
        mode: "admin_copilot",
        ticketId: "t-switch",
        copilotSessionId: "sess-2",
        conversationCompact: "user: còn hàng không",
        supportTags: [],
        escalationLevel: "low",
        inventorySummary: { outOfStock: 0, lowStock: 1, alerts: [] },
      },
    };
    buildAdminCopilotChatResult({
      message: "tồn kho sách X",
      context: ctxBase,
      tenantId: "public",
    });
    const { graphReasoningInfo } = buildAdminCopilotChatResult({
      message: "khách khiếu nại đơn hàng chưa giao, chưa nhận được hàng",
      context: ctxBase,
      tenantId: "public",
    });
    expect(graphReasoningInfo.pathsUsed[0].focus).toBe("support");
    expect(graphReasoningInfo.pathsUsed[0].rerank).toMatch(/topic_switch|scores/i);
  });

  test("reply_help intent uses support-style directions", () => {
    const { mainAnswer, graphReasoningInfo } = buildAdminCopilotChatResult({
      message: "Nên phản hồi sao với khách trong tình huống này?",
      context: {
        supportMode: "admin_copilot",
        adminCopilot: {
          mode: "admin_copilot",
          ticketId: "t-reply",
          copilotSessionId: "sess-3",
          conversationCompact: "user: đơn chưa đến",
          supportTags: ["Giao hàng"],
          escalationLevel: "low",
          inventorySummary: {},
        },
      },
      tenantId: "public",
    });
    expect(graphReasoningInfo.pathsUsed[0].intentMode).toBe("reply_help");
    expect(mainAnswer).toMatch(/Đọc lại|tin gần nhất|khách/i);
  });
});
