const { CorpusDocument } = require("../models/CorpusDocument");
const { normalize, rankCatalogHybrid, mergeByRefId } = require("./retrievalService");
const { normalizeTenantId } = require("./tenantContextService");

/** Explicit lightweight property-graph vocabulary (Mongo-backed metadata, no graph DB). */
const ENTITY_TYPES = {
  BOOK: "book",
  AUTHOR: "author",
  CATEGORY: "category",
  FAQ_TOPIC: "faq_topic",
  POLICY_TOPIC: "policy_topic",
};

const RELATION_KINDS = {
  AUTHORED_BY: "authored_by",
  BELONGS_TO: "belongs_to",
  RELATED_TO: "related_to",
  CHEAPER_IN_CATEGORY: "cheaper_in_category",
  RECOMMENDED_NEXT: "recommended_next",
};

const authorKeyFromAuthor = (author = "") =>
  normalize(author)
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .trim();

const getGraph = (doc) => (doc && doc.metadata && doc.metadata.graph) || {};

const relationsOf = (doc) => {
  const g = getGraph(doc);
  return Array.isArray(g.relations) ? g.relations : [];
};

const relationTargets = (doc, kind, targetType = null) =>
  relationsOf(doc).filter((r) => {
    if (r.kind !== kind) {
      return false;
    }
    if (!targetType) {
      return true;
    }
    return r.targetType === targetType;
  });

const resolveTenantId = (tenantId) => normalizeTenantId(tenantId, "public");

/**
 * Path 1: book --authored_by--> author --(inverse query)--> other books
 * Returns docs + explicit path description for explanations / graphReasoningInfo.
 */
const traverseSameAuthorFromBook = async (
  focusDoc,
  { tenantId = "public", excludeRefId, limit = 4 } = {}
) => {
  const g = getGraph(focusDoc);
  const rel = relationTargets(focusDoc, RELATION_KINDS.AUTHORED_BY, ENTITY_TYPES.AUTHOR)[0];
  const authorKey = rel?.targetId || rel?.target || g.authorKey;
  if (!authorKey) {
    return {
      docs: [],
      pathDescription:
        "book → authored_by → author: (thiếu authorKey trong đồ thị metadata)",
      steps: [],
    };
  }
  const docs = await findSameAuthor(authorKey, { tenantId, excludeRefId, limit });
  return {
    docs,
    pathDescription: `book:${focusDoc.refId} → authored_by → author:${authorKey} → (cùng authorKey trong catalog)`,
    steps: [
      { edge: RELATION_KINDS.AUTHORED_BY, from: `book:${focusDoc.refId}`, to: `author:${authorKey}` },
      { op: "expand_catalog", by: "metadata.graph.authorKey", value: authorKey },
    ],
    authorKey,
  };
};

/**
 * Path 2: book --belongs_to--> category --(inverse query)--> other books
 */
const traverseSameCategoryFromBook = async (
  focusDoc,
  { tenantId = "public", excludeRefId, limit = 4 } = {}
) => {
  const g = getGraph(focusDoc);
  const rel = relationTargets(focusDoc, RELATION_KINDS.BELONGS_TO, ENTITY_TYPES.CATEGORY)[0];
  const categoryKey = rel?.targetId || rel?.target || g.categoryKey;
  if (!categoryKey) {
    return {
      docs: [],
      pathDescription: "book → belongs_to → category: (thiếu categoryKey)",
      steps: [],
    };
  }
  const docs = await findSameCategory(categoryKey, { tenantId, excludeRefId, limit });
  return {
    docs,
    pathDescription: `book:${focusDoc.refId} → belongs_to → category:${categoryKey} → (cùng categoryKey trong catalog)`,
    steps: [
      { edge: RELATION_KINDS.BELONGS_TO, from: `book:${focusDoc.refId}`, to: `category:${categoryKey}` },
      { op: "expand_catalog", by: "metadata.graph.categoryKey", value: categoryKey },
    ],
    categoryKey,
  };
};

/**
 * Cross-type: book --related_to--> faq_topic (policy / FAQ), then load corpus node by refId.
 */
const traverseBookToFaqTopic = async (focusDoc, faqRefId, tenantId = "public") => {
  if (!focusDoc || !faqRefId) {
    return { doc: null, steps: [] };
  }
  const targets = relationsOf(focusDoc).filter(
    (r) =>
      r.kind === RELATION_KINDS.RELATED_TO &&
      (r.targetType === ENTITY_TYPES.FAQ_TOPIC || r.targetType === ENTITY_TYPES.POLICY_TOPIC) &&
      (r.targetId === faqRefId || r.target === faqRefId)
  );
  if (!targets.length) {
    return { doc: null, steps: [] };
  }
  const scopedTenantId = resolveTenantId(tenantId);
  const doc = await CorpusDocument.findOne({
    tenantId: scopedTenantId,
    sourceType: "faq",
    refId: String(faqRefId),
  }).lean();
  return {
    doc,
    steps: [
      {
        edge: RELATION_KINDS.RELATED_TO,
        from: `book:${focusDoc.refId}`,
        to: `${ENTITY_TYPES.FAQ_TOPIC}:${faqRefId}`,
      },
      { op: "fetch_corpus", sourceType: "faq", refId: String(faqRefId) },
    ],
  };
};

const findSameAuthor = async (authorKey, { tenantId = "public", excludeRefId, limit = 4 } = {}) => {
  if (!authorKey) {
    return [];
  }
  const scopedTenantId = resolveTenantId(tenantId);
  const q = {
    tenantId: scopedTenantId,
    sourceType: "catalog",
    "metadata.graph.authorKey": authorKey,
  };
  if (excludeRefId) {
    q.refId = { $ne: String(excludeRefId) };
  }
  const docs = await CorpusDocument.find(q)
    .sort({ "metadata.soldCount": -1 })
    .limit(limit + 4)
    .lean();
  return docs.slice(0, limit);
};

const findSameCategory = async (
  categoryKey,
  { tenantId = "public", excludeRefId, limit = 4 } = {}
) => {
  if (!categoryKey) {
    return [];
  }
  const scopedTenantId = resolveTenantId(tenantId);
  const q = {
    tenantId: scopedTenantId,
    sourceType: "catalog",
    "metadata.graph.categoryKey": categoryKey,
  };
  if (excludeRefId) {
    q.refId = { $ne: String(excludeRefId) };
  }
  const docs = await CorpusDocument.find(q)
    .sort({ "metadata.soldCount": -1 })
    .limit(limit + 4)
    .lean();
  return docs.slice(0, limit);
};

const findCheaperInCategory = async (
  categoryKey,
  referencePrice,
  { tenantId = "public", excludeRefId, limit = 4 } = {}
) => {
  if (!categoryKey || referencePrice === undefined || referencePrice === null) {
    return [];
  }
  const rp = Number(referencePrice);
  if (!Number.isFinite(rp)) {
    return [];
  }
  const scopedTenantId = resolveTenantId(tenantId);
  const q = {
    tenantId: scopedTenantId,
    sourceType: "catalog",
    "metadata.graph.categoryKey": categoryKey,
    "metadata.price": { $lt: rp },
  };
  if (excludeRefId) {
    q.refId = { $ne: String(excludeRefId) };
  }
  const docs = await CorpusDocument.find(q)
    .sort({ "metadata.price": 1 })
    .limit(limit + 6)
    .lean();
  return docs.slice(0, limit);
};

/** Deterministic "recommended_next": inferred — top sold in same category excluding focus. */
const inferRecommendedNext = async (
  focusDoc,
  { tenantId = "public", excludeRefId, limit = 3 } = {}
) => {
  const ck = getGraph(focusDoc).categoryKey;
  if (!ck) {
    return { docs: [], pathDescription: "(không có thể loại để suy luận recommended_next)" };
  }
  const docs = await findSameCategory(ck, {
    tenantId,
    excludeRefId: excludeRefId || focusDoc?.refId,
    limit: limit + 2,
  });
  return {
    docs: docs.slice(0, limit),
    pathDescription: `book → belongs_to → category:${ck} → (sắp xếp soldCount, gợi ý tiếp theo trong nhóm)`,
    relationKind: RELATION_KINDS.RECOMMENDED_NEXT,
  };
};

const findCatalogByProductId = async (refId, tenantId = "public") => {
  if (!refId) {
    return null;
  }
  return CorpusDocument.findOne({
    tenantId: resolveTenantId(tenantId),
    sourceType: "catalog",
    refId: String(refId),
  }).lean();
};

const explainMatch = (userMessage, doc) => {
  if (!doc) {
    return "Không có đủ ngữ cảnh sách trong phiên để giải thích chi tiết.";
  }
  const meta = doc.metadata || {};
  const g = meta.graph || {};
  const relA = relationTargets(doc, RELATION_KINDS.AUTHORED_BY, ENTITY_TYPES.AUTHOR)[0];
  const relC = relationTargets(doc, RELATION_KINDS.BELONGS_TO, ENTITY_TYPES.CATEGORY)[0];
  const authorKey = relA?.targetId || relA?.target || g.authorKey;
  const categoryKey = relC?.targetId || relC?.target || g.categoryKey;
  const parts = [];
  parts.push(
    `Cuốn “${meta.title || doc.title}” khớp truy vấn (“${(userMessage || "").slice(0, 80)}”) trên chỉ mục từ khóa (không dùng vector).`
  );
  if (authorKey) {
    parts.push(`Theo đồ thị nội bộ, nút tác giả (authored_by) là “${authorKey}”.`);
  }
  if (categoryKey) {
    parts.push(`Nút thể loại (belongs_to) là “${categoryKey}”.`);
  }
  if (meta.soldCount) {
    parts.push(`Độ phổ biến (soldCount=${meta.soldCount}) được dùng khi xếp hạng gợi ý.`);
  }
  return parts.join(" ");
};

module.exports = {
  ENTITY_TYPES,
  RELATION_KINDS,
  authorKeyFromAuthor,
  relationsOf,
  relationTargets,
  traverseSameAuthorFromBook,
  traverseSameCategoryFromBook,
  traverseBookToFaqTopic,
  findSameAuthor,
  findSameCategory,
  findCheaperInCategory,
  inferRecommendedNext,
  findCatalogByProductId,
  rankCatalogHybrid,
  mergeByRefId,
  explainMatch,
};
