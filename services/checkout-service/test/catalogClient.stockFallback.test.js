const { fetchProductSnapshot } = require("../src/services/catalogClient");

describe("catalogClient stock fallback", () => {
  const config = {
    catalogServiceUrl: "http://catalog-service:4002",
    catalogRequestTimeoutMs: 1000,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("treats stock=0 as unspecified for legacy products", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          item: {
            _id: "p1",
            title: "Legacy Product",
            price: 120000,
            imgSrc: "legacy.jpg",
            stock: 0,
          },
        },
      }),
    });

    const result = await fetchProductSnapshot({ config, productId: "p1" });

    expect(result.ok).toBe(true);
    expect(result.data.stockSnapshot).toBe(999999);
  });
});
