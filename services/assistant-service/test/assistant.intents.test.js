const {
  detectIntent,
  detectPolicyIntent,
  detectHumanSupportIntent,
} = require("../src/services/assistantIntents");
const { analyzeQuery } = require("../src/services/queryUnderstandingService");

describe("assistant intents", () => {
  test("detects same_author", () => {
    expect(detectIntent("có sách nào cùng tác giả không?")).toBe("same_author");
  });

  test("detects same_category", () => {
    expect(detectIntent("gợi ý sách cùng thể loại")).toBe("same_category");
  });

  test("detects explain", () => {
    expect(detectIntent("vì sao bạn gợi ý cuốn này")).toBe("explain");
  });

  test("detects cheaper", () => {
    expect(detectIntent("sách giá rẻ hơn trong cùng thể loại")).toBe("cheaper");
  });

  test("detects related_next", () => {
    expect(detectIntent("nếu thích cuốn này thì nên đọc gì tiếp")).toBe("related_next");
  });

  test("detects recommendation from natural beginner frontend query", () => {
    expect(detectIntent("mình mới học frontend thì nên đọc gì?")).toBe("recommend");
  });

  test("detects cheaper intent from casual paraphrase", () => {
    expect(detectIntent("có sách nào tương tự cuốn này mà rẻ hơn không?")).toBe("cheaper");
  });

  test("detects shipping policy from casual word ship", () => {
    const analysis = analyzeQuery("ship sách này sao vậy?");
    expect(detectPolicyIntent(analysis)).toEqual({
      faqRefId: "shipping",
      badge: "policy_shipping",
    });
  });

  test("detects returns policy from natural phrasing", () => {
    const analysis = analyzeQuery("nếu mua cuốn này mà không ưng thì đổi được không?");
    expect(detectPolicyIntent(analysis)).toEqual({
      faqRefId: "returns",
      badge: "policy_returns",
    });
  });

  test("detects explicit human support handoff intent", () => {
    const analysis = analyzeQuery("toi can nhan vien ho tro, cho minh noi chuyen voi shop");
    expect(detectHumanSupportIntent(analysis)).toBe(true);
  });
});
