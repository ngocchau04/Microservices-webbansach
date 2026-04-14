const { analyzeQuery } = require("../src/services/queryUnderstandingService");

describe("query understanding", () => {
  test("normalizes and expands casual frontend beginner query", () => {
    const analysis = analyzeQuery("Mình mới học frontend thì nên đọc sách gì?");
    expect(analysis.normalizedQuery).toContain("frontend");
    expect(analysis.concepts).toEqual(
      expect.arrayContaining(["beginner", "frontend", "recommendation"])
    );
    expect(analysis.expandedTokens).toEqual(
      expect.arrayContaining(["react", "javascript", "frontend"])
    );
    expect(analysis.rewrittenQuery).toContain("goi y sach");
  });

  test("maps ship/refund aliases to policy concepts", () => {
    const shipping = analyzeQuery("ship cuốn này thế nào?");
    expect(shipping.concepts).toEqual(expect.arrayContaining(["shipping_policy"]));

    const returns = analyzeQuery("không ưng thì refund được không?");
    expect(returns.concepts).toEqual(expect.arrayContaining(["return_policy"]));
  });

  test("captures backend + beginner intent from natural sentence", () => {
    const analysis = analyzeQuery("mình muốn sách node cho người mới học backend");
    expect(analysis.concepts).toEqual(
      expect.arrayContaining(["backend", "beginner", "recommendation"])
    );
  });
});
