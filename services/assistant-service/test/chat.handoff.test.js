jest.mock("../src/services/retrievalService", () => ({
  retrieve: jest.fn(async () => ({ queryTokens: [], docs: [], retrievalMeta: { topScore: 0 } })),
  pickRecommendations: jest.fn(async () => []),
  rankCatalogHybrid: jest.fn(() => []),
  mergeByRefId: jest.fn((lists) => lists.flat()),
}));

jest.mock("../src/services/graphService", () => ({
  findSameAuthor: jest.fn(async () => []),
  findSameCategory: jest.fn(async () => []),
  findCheaperInCategory: jest.fn(async () => []),
  findCatalogByProductId: jest.fn(async () => null),
  explainMatch: jest.fn(() => ""),
  traverseSameAuthorFromBook: jest.fn(async () => ({ docs: [], steps: [] })),
  traverseSameCategoryFromBook: jest.fn(async () => ({ docs: [], steps: [] })),
  traverseBookToFaqTopic: jest.fn(async () => ({ doc: null, steps: [] })),
  inferRecommendedNext: jest.fn(async () => ({ docs: [], steps: [] })),
  RELATION_KINDS: { AUTHORED_BY: "authored_by", BELONGS_TO: "belongs_to" },
}));

jest.mock("../src/models/CorpusDocument", () => ({
  CorpusDocument: {
    findOne: jest.fn(async () => null),
  },
}));

jest.mock("../src/services/supportHandoffService", () => ({
  createOrOpenSupportHandoff: jest.fn(async () => ({
    ok: true,
    data: {
      conversation: { _id: "conv_1", handoffState: "waiting_human" },
      handoff: { mode: "human", state: "waiting_human", conversationId: "conv_1" },
    },
  })),
}));

const chatService = require("../src/services/chatService");
const { createOrOpenSupportHandoff } = require("../src/services/supportHandoffService");

describe("chat handoff", () => {
  beforeEach(() => {
    createOrOpenSupportHandoff.mockClear();
  });

  test("returns handoff payload when explicit human support intent is detected", async () => {
    const result = await chatService.chat({
      message: "toi can nhan vien ho tro",
      context: { userId: "u1", userEmail: "u1@example.com", sessionId: "sess1" },
      actor: { userId: "u1", email: "u1@example.com", tenantId: "tenant_a" },
      tenantId: "tenant_a",
      config: { supportServiceUrl: "http://localhost:4007", supportInternalApiKey: "key" },
    });

    expect(result.ok).toBe(true);
    expect(result.data.handoff.mode).toBe("human");
    expect(result.data.handoff.conversationId).toBe("conv_1");
    expect(result.data.mainAnswer).toContain("nhân viên hỗ trợ");
    expect(createOrOpenSupportHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant_a" })
    );
  });

  test("asks login before handoff if userId is missing", async () => {
    const result = await chatService.chat({
      message: "cho minh noi chuyen voi shop",
      context: {},
      config: { supportServiceUrl: "http://localhost:4007", supportInternalApiKey: "key" },
    });

    expect(result.ok).toBe(true);
    expect(result.data.handoff.mode).toBe("bot_only");
    expect(result.data.mainAnswer).toMatch(/đăng nhập|dang nhap/i);
  });
});
