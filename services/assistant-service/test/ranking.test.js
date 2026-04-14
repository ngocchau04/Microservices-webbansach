const { rankCatalogHybrid, mergeByRefId, tokenize } = require("../src/services/retrievalService");

describe("rankCatalogHybrid", () => {
  test("orders by lexical + graph signals + popularity", () => {
    const docs = [
      {
        refId: "a",
        title: "Sách: React",
        body: "react hooks",
        keywords: ["react"],
        metadata: { soldCount: 5, title: "React" },
      },
      {
        refId: "b",
        title: "Sách: Vue",
        body: "vue js",
        keywords: [],
        metadata: { soldCount: 500, title: "Vue" },
      },
    ];
    const signalsByRefId = {
      a: ["lexical_primary", "same_author"],
      b: ["same_category"],
    };
    const ranked = rankCatalogHybrid(docs, {
      queryTokens: tokenize("react"),
      signalsByRefId,
    });
    expect(ranked[0].doc.refId).toBe("a");
  });

  test("mergeByRefId preserves first occurrence order", () => {
    const a = { refId: "1" };
    const b = { refId: "2" };
    const merged = mergeByRefId([[a], [{ ...b }, { ...a }]]);
    expect(merged.map((d) => d.refId)).toEqual(["1", "2"]);
  });
});
