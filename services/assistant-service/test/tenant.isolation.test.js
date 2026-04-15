process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.ASSISTANT_DB_NAME = "book_assistant_jest";

const mongoose = require("mongoose");
const { connectDatabase } = require("../src/config/database");
const { CorpusDocument } = require("../src/models/CorpusDocument");
const { retrieve, normalize } = require("../src/services/retrievalService");
const { traverseSameCategoryFromBook } = require("../src/services/graphService");
const { runReindex } = require("../src/services/reindexService");

describe("assistant multi-tenant isolation", () => {
  const originalFetch = global.fetch;

  beforeAll(async () => {
    await connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: process.env.ASSISTANT_DB_NAME,
    });
  });

  beforeEach(async () => {
    await CorpusDocument.deleteMany({});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("retrieve only returns documents within tenant scope", async () => {
    await CorpusDocument.create([
      {
        tenantId: "tenant_a",
        sourceType: "faq",
        refId: "shipping",
        title: "Shipping A",
        body: "Chinh sach van chuyen tenant A",
        keywords: ["van chuyen", "shipping"],
        normalizedText: normalize("Shipping A Chinh sach van chuyen tenant A"),
      },
      {
        tenantId: "tenant_b",
        sourceType: "faq",
        refId: "shipping",
        title: "Shipping B",
        body: "Chinh sach van chuyen tenant B",
        keywords: ["van chuyen", "shipping"],
        normalizedText: normalize("Shipping B Chinh sach van chuyen tenant B"),
      },
    ]);

    const result = await retrieve("shipping", {
      tenantId: "tenant_a",
      context: {},
    });

    expect(result.docs.length).toBeGreaterThan(0);
    expect(result.docs.every((doc) => doc.tenantId === "tenant_a")).toBe(true);
  });

  test("graph traversal stays inside tenant scope", async () => {
    await CorpusDocument.create([
      {
        tenantId: "tenant_a",
        sourceType: "catalog",
        refId: "book_a_1",
        title: "Sach A1",
        body: "book A1",
        keywords: ["a1"],
        metadata: {
          soldCount: 10,
          graph: {
            categoryKey: "react",
            relations: [
              {
                kind: "belongs_to",
                targetType: "category",
                targetId: "react",
              },
            ],
          },
        },
      },
      {
        tenantId: "tenant_a",
        sourceType: "catalog",
        refId: "book_a_2",
        title: "Sach A2",
        body: "book A2",
        keywords: ["a2"],
        metadata: {
          soldCount: 12,
          graph: {
            categoryKey: "react",
          },
        },
      },
      {
        tenantId: "tenant_b",
        sourceType: "catalog",
        refId: "book_b_1",
        title: "Sach B1",
        body: "book B1",
        keywords: ["b1"],
        metadata: {
          soldCount: 200,
          graph: {
            categoryKey: "react",
          },
        },
      },
    ]);

    const focusDoc = await CorpusDocument.findOne({ tenantId: "tenant_a", refId: "book_a_1" }).lean();
    const traversal = await traverseSameCategoryFromBook(focusDoc, {
      tenantId: "tenant_a",
      excludeRefId: "book_a_1",
      limit: 5,
    });

    expect(traversal.docs.length).toBeGreaterThan(0);
    expect(traversal.docs.every((doc) => doc.tenantId === "tenant_a")).toBe(true);
    expect(traversal.docs.some((doc) => doc.refId === "book_b_1")).toBe(false);
  });

  test("tenant-scoped reindex does not delete another tenant corpus", async () => {
    await CorpusDocument.create([
      {
        tenantId: "tenant_a",
        sourceType: "catalog",
        refId: "old_a",
        title: "Old A",
        body: "old",
        keywords: [],
      },
      {
        tenantId: "tenant_b",
        sourceType: "catalog",
        refId: "old_b",
        title: "Old B",
        body: "old",
        keywords: [],
      },
    ]);

    global.fetch = jest.fn(async (_url, options = {}) => {
      const tenant = options.headers?.["x-tenant-id"];
      const key = options.headers?.["x-internal-api-key"];
      if (key !== "catalog_internal_test_key") {
        return {
          ok: false,
          status: 401,
          json: async () => ({ message: "invalid key" }),
        };
      }
      if (tenant === "tenant_a") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              items: [
                {
                  _id: "new_a_1",
                  title: "New Tenant A Book",
                  author: "Author A",
                  type: "react",
                  price: 120000,
                  soldCount: 30,
                },
              ],
              total: 1,
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            items: [
              {
                _id: "new_b_1",
                title: "Tenant B Book",
                author: "Author B",
                type: "react",
                price: 130000,
                soldCount: 22,
              },
            ],
            total: 1,
          },
        }),
      };
    });

    const result = await runReindex(
      {
        catalogServiceUrl: "http://catalog-service:4002",
        defaultTenantId: "public",
        catalogInternalApiKey: "catalog_internal_test_key",
      },
      "tenant_a"
    );

    expect(result.ok).toBe(true);
    const tenantAOld = await CorpusDocument.findOne({
      tenantId: "tenant_a",
      sourceType: "catalog",
      refId: "old_a",
    }).lean();
    const tenantBOld = await CorpusDocument.findOne({
      tenantId: "tenant_b",
      sourceType: "catalog",
      refId: "old_b",
    }).lean();
    const tenantANew = await CorpusDocument.findOne({
      tenantId: "tenant_a",
      sourceType: "catalog",
      refId: "new_a_1",
    }).lean();
    const tenantAForeign = await CorpusDocument.findOne({
      tenantId: "tenant_a",
      sourceType: "catalog",
      refId: "new_b_1",
    }).lean();

    expect(tenantAOld).toBeNull();
    expect(tenantANew).toBeTruthy();
    expect(tenantAForeign).toBeNull();
    expect(tenantBOld).toBeTruthy();
  });
});
