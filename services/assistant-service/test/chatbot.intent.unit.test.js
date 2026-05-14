const {
  detectIntentDetailed,
  defaultFollowUpChips,
  faqTopicChips,
} = require("../src/services/assistantIntents");

describe("chatbot intent unit", () => {
  test("detectIntentDetailed prioritizes cheaper intent when product context is available", () => {
    const result = detectIntentDetailed("co sach nao re hon khong?", {
      context: {
        lastProductId: "book_1",
      },
    });

    expect(result.intent).toBe("cheaper");
    expect(result.confidenceLabel).toMatch(/high|medium/);
  });

  test("detectIntentDetailed recognizes greeting as general intent", () => {
    const result = detectIntentDetailed("xin chao");

    expect(result.intent).toBe("general");
    expect(result.confidence).toBeGreaterThan(0);
  });

  test("default follow-up and faq chips expose clean user-facing options", () => {
    const followUps = defaultFollowUpChips();
    const faqChips = faqTopicChips();

    expect(followUps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "shipping" }),
        expect.objectContaining({ id: "returns" }),
      ])
    );

    expect(faqChips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "contact" }),
      ])
    );
  });
});
