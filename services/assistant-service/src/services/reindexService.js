const fs = require("fs");
const path = require("path");
const { CorpusDocument } = require("../models/CorpusDocument");
const { normalize } = require("./retrievalService");
const { authorKeyFromAuthor } = require("./graphService");
const { normalizeTenantId } = require("./tenantContextService");
const { generateBatchEmbeddings } = require("./geminiService");

const fetchJson = async (
  url,
  { timeoutMs = 20000, tenantId = "public", catalogInternalApiKey = "" } = {}
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "x-tenant-id": tenantId,
        ...(catalogInternalApiKey ? { "x-internal-api-key": catalogInternalApiKey } : {}),
      },
    });
    if (!response.ok) {
      return { ok: false, status: response.status, message: `HTTP ${response.status}` };
    }
    const json = await response.json();
    return { ok: true, json };
  } catch (error) {
    return { ok: false, message: error.message || "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
};

const loadDefaultFaq = () => {
  const filePath = path.join(__dirname, "../data/defaultFaq.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
};

const buildCatalogDocs = (items = [], tenantId = "public") =>
  items.map((item) => {
    const id = `${item._id || item.id || ""}`;
    const title = item.title || "Sản phẩm";
    const author = item.author || "";
    const description = item.description || "";
    const type = item.type || "";
    const body = [
      title,
      author,
      description,
      item.publisher || "",
      item.language || "",
      type,
      Array.isArray(item.features) ? item.features.join(" ") : "",
    ]
      .filter(Boolean)
      .join("\n");

    const authorKey = authorKeyFromAuthor(author);
    const categoryKey = type ? String(type) : "";

    return {
      tenantId,
      sourceType: "catalog",
      refId: id,
      title: `Sách: ${title}`,
      body,
      keywords: [title, author, type, "sách", "book"].filter(Boolean),
      metadata: {
        productId: id,
        title: item.title,
        author: item.author,
        price: item.price,
        imgSrc: item.imgSrc,
        type: item.type,
        soldCount: item.soldCount,
        rating: item.rating,
        graph: {
          entity: "book",
          bookId: id,
          authorKey,
          categoryKey,
          relations: [
            {
              kind: "authored_by",
              sourceType: "book",
              sourceId: id,
              targetType: "author",
              targetId: authorKey,
              target: authorKey,
            },
            {
              kind: "belongs_to",
              sourceType: "book",
              sourceId: id,
              targetType: "category",
              targetId: categoryKey,
              target: categoryKey,
            },
            {
              kind: "related_to",
              targetType: "topic",
              targetId: `catalog:${categoryKey}`,
              target: `catalog:${categoryKey}`,
            },
            {
              kind: "related_to",
              targetType: "faq_topic",
              targetId: "shipping",
              target: "shipping",
            },
            {
              kind: "related_to",
              targetType: "faq_topic",
              targetId: "returns",
              target: "returns",
            },
            {
              kind: "related_to",
              targetType: "faq_topic",
              targetId: "contact",
              target: "contact",
            },
          ],
        },
      },
    };
  });

const buildNormalizedText = (doc) =>
  normalize(`${doc.title || ""} ${doc.body || ""} ${(doc.keywords || []).join(" ")}`);

const upsertDocs = async (docs, tenantId = "public") => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  
  // Generate embeddings in batches of 30 to be efficient
  const batchSize = 30;
  const docsWithEmbeddings = [];
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const textsToEmbed = chunk.map(d => `${d.title}. ${d.body}`.slice(0, 1500));
    const embeddings = await generateBatchEmbeddings(textsToEmbed);
    
    chunk.forEach((doc, index) => {
      docsWithEmbeddings.push({
        ...doc,
        embedding: embeddings[index] || undefined
      });
    });
  }

  let upserted = 0;
  for (const doc of docsWithEmbeddings) {
    const normalizedText = buildNormalizedText(doc);
    await CorpusDocument.updateOne(
      { tenantId: scopedTenantId, sourceType: doc.sourceType, refId: doc.refId },
      {
        $set: {
          ...doc,
          tenantId: scopedTenantId,
          normalizedText,
          indexedAt: new Date(),
        },
      },
      { upsert: true }
    );
    upserted += 1;
  }
  return upserted;
};

const extractCatalogItems = (json) => {
  const items = json?.data?.items || json?.data?.products || json?.legacy?.products;
  if (items === undefined || items === null) {
    return null;
  }
  return Array.isArray(items) ? items : null;
};

const reindexFaq = async (tenantId = "public") => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  const faqItems = loadDefaultFaq();
  const docs = faqItems.map((item) => ({
    tenantId: scopedTenantId,
    sourceType: "faq",
    refId: item.id,
    title: item.title,
    body: item.body,
    keywords: item.keywords || [],
    metadata: {
      faqId: item.id,
      graph: {
        entity: "faq_topic",
        topicKey: item.topicKey || item.id,
        relations: [
          {
            kind: "related_to",
            targetType: "policy_topic",
            targetId: item.topicKey || item.id,
            target: item.topicKey || item.id,
          },
        ],
      },
    },
  }));
  return upsertDocs(docs, scopedTenantId);
};

const reindexSupportHints = async (tenantId = "public") => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  const docs = [
    {
      tenantId: scopedTenantId,
      sourceType: "support",
      refId: "guidance-general",
      title: "Gợi ý: phản hồi và hỗ trợ",
      body: "Người dùng đã đăng nhập có thể gửi phản hồi qua chức năng hỗ trợ trong ứng dụng. Trợ lý chỉ trả lời dựa trên nội dung đã được lập chỉ mục và FAQ.",
      keywords: ["phản hồi", "feedback", "hỗ trợ", "ticket"],
      metadata: { kind: "static-hint" },
    },
  ];
  return upsertDocs(docs, scopedTenantId);
};

const runReindex = async (config, tenantId = "public") => {
  const scopedTenantId = normalizeTenantId(tenantId, config?.defaultTenantId || "public");
  if (!config.catalogInternalApiKey) {
    return {
      ok: false,
      statusCode: 503,
      message: "Catalog internal API key is not configured",
      code: "ASSISTANT_REINDEX_CATALOG_AUTH_MISSING",
    };
  }
  const faqCount = await reindexFaq(scopedTenantId);
  const supportCount = await reindexSupportHints(scopedTenantId);

  const pageSize = 100;
  const firstUrl = `${config.catalogServiceUrl}/products?limit=${pageSize}&page=1`;
  const firstResult = await fetchJson(firstUrl, {
    tenantId: scopedTenantId,
    catalogInternalApiKey: config.catalogInternalApiKey,
  });

  if (!firstResult.ok) {
    return {
      ok: false,
      statusCode: 502,
      message: firstResult.message || "Catalog request failed",
      code: "ASSISTANT_CATALOG_FETCH_FAILED",
    };
  }

  const items1 = extractCatalogItems(firstResult.json);
  if (items1 === null) {
    return {
      ok: false,
      statusCode: 502,
      message: "Invalid catalog response shape",
      code: "ASSISTANT_CATALOG_INVALID_RESPONSE",
    };
  }

  await CorpusDocument.deleteMany({ tenantId: scopedTenantId, sourceType: "catalog" });

  let catalogUpserted = 0;
  if (items1.length > 0) {
    catalogUpserted += await upsertDocs(buildCatalogDocs(items1, scopedTenantId), scopedTenantId);
  }

  const total = firstResult.json?.data?.total;
  let page = 1;
  let lastItems = items1;

  for (;;) {
    if (lastItems.length < pageSize) {
      break;
    }
    if (typeof total === "number" && page * pageSize >= total) {
      break;
    }

    page += 1;
    if (page > 200) {
      break;
    }

    const url = `${config.catalogServiceUrl}/products?limit=${pageSize}&page=${page}`;
    const result = await fetchJson(url, {
      tenantId: scopedTenantId,
      catalogInternalApiKey: config.catalogInternalApiKey,
    });
    if (!result.ok) {
      return {
        ok: false,
        statusCode: 502,
        message: result.message || "Catalog request failed during pagination",
        code: "ASSISTANT_CATALOG_FETCH_FAILED",
      };
    }

    const items = extractCatalogItems(result.json);
    if (items === null) {
      return {
        ok: false,
        statusCode: 502,
        message: "Invalid catalog response shape",
        code: "ASSISTANT_CATALOG_INVALID_RESPONSE",
      };
    }

    if (items.length === 0) {
      break;
    }

    catalogUpserted += await upsertDocs(buildCatalogDocs(items, scopedTenantId), scopedTenantId);
    lastItems = items;
  }

  return {
    ok: true,
    statusCode: 200,
    data: {
      tenantId: scopedTenantId,
      catalogUpserted,
      faqUpserted: faqCount,
      supportUpserted: supportCount,
    },
  };
};

module.exports = {
  runReindex,
  loadDefaultFaq,
};
