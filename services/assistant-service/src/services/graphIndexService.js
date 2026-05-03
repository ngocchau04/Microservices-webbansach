const { GraphEntity } = require("../models/GraphEntity");
const { GraphRelation } = require("../models/GraphRelation");
const catalogClient = require("../utils/catalogClient");
const { normalizeTenantId } = require("./tenantContextService");
const { GRAPH_ENTITY_TYPES, GRAPH_RELATION_TYPES } = require("../graph/constants");
const {
  normalizeText,
  makeBookEntityId,
  makeAuthorEntityId,
  makeCategoryEntityId,
  makeTagEntityId,
  makePublisherEntityId,
} = require("../graph/helpers");

const MAX_TAGS_PER_BOOK = 6;
const MAX_SIMILAR_PER_BOOK = 8;
const MAX_CHEAPER_PER_BOOK = 6;

const CATEGORY_LABEL_MAP = {
  V: "van_hoc",
  K: "kinh_doanh",
  G: "giao_duc",
  T: "thieu_nhi",
  A: "ky_nang_song",
  N: "nuoi_day_con",
  C: "chinh_tri_phap_luat",
  I: "nghe_thuat",
  Y: "suc_khoe",
  D: "du_lich",
};

const STOPWORDS = new Set([
  "sach",
  "book",
  "va",
  "the",
  "for",
  "with",
  "cho",
  "cua",
  "mot",
  "nhung",
  "trong",
]);

const splitTokens = (value = "") =>
  normalizeText(value)
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

const buildTags = (product) => {
  const titleTokens = splitTokens(product.title || "");
  const descTokens = splitTokens(product.description || "");
  const categoryLabel = CATEGORY_LABEL_MAP[String(product.type || "").trim()] || "";
  const merged = [...new Set([...titleTokens, ...descTokens, categoryLabel].filter(Boolean))];
  return merged.slice(0, MAX_TAGS_PER_BOOK);
};

const toBookEntity = (product, tenantId) => {
  const id = String(product._id || product.id || "").trim();
  const categoryCode = String(product.type || "").trim();
  return {
    tenantId,
    entityId: makeBookEntityId(id),
    type: GRAPH_ENTITY_TYPES.BOOK,
    refId: id,
    name: product.title || "Sach",
    normalizedName: normalizeText(product.title || ""),
    metadata: {
      price: Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      image: product.imgSrc || "",
      author: product.author || "",
      category: categoryCode,
      categoryLabel: CATEGORY_LABEL_MAP[categoryCode] || categoryCode,
      rating: Number(product.rating) || 0,
      reviewsCount: Number(product.reviewsCount) || 0,
      soldCount: Number(product.soldCount) || 0,
      description: product.description || "",
      publisher: product.publisher || "",
    },
    confidence: 1.0,
  };
};

const buildNodeAndEdgeSets = ({ products = [], tenantId }) => {
  const entities = new Map();
  const relations = new Map();

  const upsertEntity = (entity) => {
    entities.set(entity.entityId, entity);
  };

  const upsertRelation = (rel) => {
    const key = `${rel.sourceId}|${rel.targetId}|${rel.type}`;
    relations.set(key, rel);
  };

  const books = products.map((product) => ({
    product,
    entity: toBookEntity(product, tenantId),
  }));

  books.forEach(({ entity }) => upsertEntity(entity));

  books.forEach(({ product, entity }) => {
    const author = String(product.author || "").trim();
    const categoryCode = String(product.type || "").trim();
    const publisher = String(product.publisher || "").trim();
    const tags = buildTags(product);

    if (author) {
      const authorId = makeAuthorEntityId(author);
      upsertEntity({
        tenantId,
        entityId: authorId,
        type: GRAPH_ENTITY_TYPES.AUTHOR,
        refId: "",
        name: author,
        normalizedName: normalizeText(author),
        metadata: {},
        confidence: 1.0,
      });
      upsertRelation({
        tenantId,
        sourceId: entity.entityId,
        targetId: authorId,
        type: GRAPH_RELATION_TYPES.WRITTEN_BY,
        metadata: {},
        confidence: 1.0,
      });
    }

    if (categoryCode) {
      const categoryLabel = CATEGORY_LABEL_MAP[categoryCode] || categoryCode;
      const categoryId = makeCategoryEntityId(categoryLabel);
      upsertEntity({
        tenantId,
        entityId: categoryId,
        type: GRAPH_ENTITY_TYPES.CATEGORY,
        refId: categoryCode,
        name: categoryLabel,
        normalizedName: normalizeText(categoryLabel),
        metadata: { categoryCode },
        confidence: 1.0,
      });
      upsertRelation({
        tenantId,
        sourceId: entity.entityId,
        targetId: categoryId,
        type: GRAPH_RELATION_TYPES.BELONGS_TO,
        metadata: { categoryCode },
        confidence: 1.0,
      });
    }

    if (publisher) {
      const publisherId = makePublisherEntityId(publisher);
      upsertEntity({
        tenantId,
        entityId: publisherId,
        type: GRAPH_ENTITY_TYPES.PUBLISHER,
        refId: "",
        name: publisher,
        normalizedName: normalizeText(publisher),
        metadata: {},
        confidence: 1.0,
      });
    }

    tags.forEach((tag) => {
      const tagId = makeTagEntityId(tag);
      upsertEntity({
        tenantId,
        entityId: tagId,
        type: GRAPH_ENTITY_TYPES.TAG,
        refId: "",
        name: tag,
        normalizedName: normalizeText(tag),
        metadata: {},
        confidence: 0.9,
      });
      upsertRelation({
        tenantId,
        sourceId: entity.entityId,
        targetId: tagId,
        type: GRAPH_RELATION_TYPES.HAS_TAG,
        metadata: {},
        confidence: 0.9,
      });
    });
  });

  const byAuthor = new Map();
  const byCategory = new Map();

  books.forEach(({ product, entity }) => {
    const authorKey = makeAuthorEntityId(product.author || "");
    const categoryKey = makeCategoryEntityId(
      CATEGORY_LABEL_MAP[String(product.type || "").trim()] || String(product.type || "").trim()
    );
    if (String(product.author || "").trim()) {
      if (!byAuthor.has(authorKey)) byAuthor.set(authorKey, []);
      byAuthor.get(authorKey).push({ product, entity });
    }
    if (String(product.type || "").trim()) {
      if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
      byCategory.get(categoryKey).push({ product, entity });
    }
  });

  // similar_to by same author/category + tag overlap
  books.forEach(({ product, entity }) => {
    const tagsA = new Set(buildTags(product));
    const authorKey = String(product.author || "").trim()
      ? makeAuthorEntityId(product.author || "")
      : "";
    const categoryKey = String(product.type || "").trim()
      ? makeCategoryEntityId(CATEGORY_LABEL_MAP[String(product.type || "").trim()] || String(product.type || "").trim())
      : "";
    const candidates = new Map();
    if (authorKey && byAuthor.has(authorKey)) {
      byAuthor.get(authorKey).forEach((item) => candidates.set(item.entity.entityId, item));
    }
    if (categoryKey && byCategory.has(categoryKey)) {
      byCategory.get(categoryKey).forEach((item) => candidates.set(item.entity.entityId, item));
    }
    candidates.delete(entity.entityId);

    const scored = Array.from(candidates.values())
      .map(({ product: p2, entity: e2 }) => {
        const tagsB = new Set(buildTags(p2));
        let score = 0;
        if (String(p2.author || "").trim() === String(product.author || "").trim()) score += 5;
        if (String(p2.type || "").trim() === String(product.type || "").trim()) score += 3;
        let overlap = 0;
        tagsA.forEach((t) => {
          if (tagsB.has(t)) overlap += 1;
        });
        score += Math.min(overlap, 4);
        return { e2, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SIMILAR_PER_BOOK);

    scored.forEach(({ e2, score }) => {
      upsertRelation({
        tenantId,
        sourceId: entity.entityId,
        targetId: e2.entityId,
        type: GRAPH_RELATION_TYPES.SIMILAR_TO,
        metadata: { score },
        confidence: 0.85,
      });
    });
  });

  // cheaper_than within same category
  byCategory.forEach((items) => {
    const sorted = [...items].sort((a, b) => Number(a.product.price || 0) - Number(b.product.price || 0));
    sorted.forEach((base, idx) => {
      const cheaperList = sorted.slice(0, idx).slice(-MAX_CHEAPER_PER_BOOK);
      cheaperList.forEach((cheap) => {
        if (Number(cheap.product.price) < Number(base.product.price)) {
          upsertRelation({
            tenantId,
            sourceId: cheap.entity.entityId,
            targetId: base.entity.entityId,
            type: GRAPH_RELATION_TYPES.CHEAPER_THAN,
            metadata: {
              priceA: Number(cheap.product.price) || 0,
              priceB: Number(base.product.price) || 0,
            },
            confidence: 1.0,
          });
        }
      });
    });
  });

  return {
    entities: Array.from(entities.values()),
    relations: Array.from(relations.values()),
  };
};

const fetchAllCatalogProducts = async (tenantId) => {
  const all = [];
  const pageSize = 100;
  for (let page = 1; page <= 200; page += 1) {
    const items = await catalogClient.searchProducts({ page, limit: pageSize }, tenantId);
    if (!Array.isArray(items) || items.length === 0) {
      break;
    }
    all.push(...items);
    if (items.length < pageSize) {
      break;
    }
  }
  return all;
};

const rebuildGraphIndex = async ({ tenantId = "public", config = {} }) => {
  const scopedTenantId = normalizeTenantId(tenantId, config.defaultTenantId || "public");
  const products = await fetchAllCatalogProducts(scopedTenantId);
  if (!products.length) {
    return {
      ok: false,
      statusCode: 502,
      message: "Cannot fetch products from catalog-service or catalog is empty",
      code: "ASSISTANT_GRAPH_REINDEX_CATALOG_UNAVAILABLE",
    };
  }

  const { entities, relations } = buildNodeAndEdgeSets({ products, tenantId: scopedTenantId });

  await GraphEntity.deleteMany({ tenantId: scopedTenantId });
  await GraphRelation.deleteMany({ tenantId: scopedTenantId });
  if (entities.length) {
    await GraphEntity.insertMany(entities, { ordered: false });
  }
  if (relations.length) {
    await GraphRelation.insertMany(relations, { ordered: false });
  }

  return {
    ok: true,
    statusCode: 200,
    data: {
      tenantId: scopedTenantId,
      entities: entities.length,
      relations: relations.length,
      message: "Graph index rebuilt successfully",
    },
  };
};

module.exports = {
  rebuildGraphIndex,
};

