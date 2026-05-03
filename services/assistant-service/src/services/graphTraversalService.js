const { GraphEntity } = require("../models/GraphEntity");
const { GraphRelation } = require("../models/GraphRelation");
const { GRAPH_RELATION_TYPES } = require("../graph/constants");
const { makeBookEntityId } = require("../graph/helpers");
const { normalizeTenantId } = require("./tenantContextService");
const catalogClient = require("../utils/catalogClient");

const toProductCard = (product, reason, graphPath = [], score = 0) => ({
  productId: String(product._id || product.id || ""),
  title: product.title || "Sach",
  author: product.author || "",
  price: Number(product.price) || 0,
  imgSrc: product.imgSrc || "",
  reasonTag: "Graph",
  reasonLine: reason,
  detailPath: product._id ? `/book/${product._id}` : "",
  graphPath,
  score,
});

const scoreCandidate = ({ relationType, product, intent, currentPrice }) => {
  let score = 0;
  if (relationType === GRAPH_RELATION_TYPES.WRITTEN_BY) score += 10;
  if (relationType === GRAPH_RELATION_TYPES.BELONGS_TO) score += 7;
  if (relationType === GRAPH_RELATION_TYPES.SIMILAR_TO) score += 6;
  if (relationType === GRAPH_RELATION_TYPES.HAS_TAG) score += 4;
  if (Number(product.stock) > 0) score += 2;
  score += Number(product.rating || 0);
  if (intent === "cheaper" && Number(product.price) < Number(currentPrice || 0)) {
    score += 3;
  }
  return score;
};

const loadBookByEntityId = async (entityId, tenantId) => {
  const entity = await GraphEntity.findOne({ tenantId, entityId, type: "Book" }).lean();
  if (!entity) return null;
  const product = await catalogClient.getProductDetails(entity.refId, tenantId);
  if (!product) return null;
  return { entity, product };
};

const findViaIntermediate = async ({ tenantId, sourceBookId, relToIntermediate, relBackToBook }) => {
  const rel1 = await GraphRelation.find({
    tenantId,
    sourceId: sourceBookId,
    type: relToIntermediate,
  }).lean();
  if (!rel1.length) return [];
  const intermediateIds = rel1.map((r) => r.targetId);
  const rel2 = await GraphRelation.find({
    tenantId,
    sourceId: { $in: intermediateIds },
    type: relBackToBook,
  }).lean();
  return rel2;
};

const graphTraverseRecommendations = async ({
  tenantId = "public",
  currentProductId,
  intent,
  limit = 5,
}) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  const sourceBookId = makeBookEntityId(currentProductId);
  const sourceNode = await loadBookByEntityId(sourceBookId, scopedTenantId);
  if (!sourceNode) {
    return { ok: false, statusCode: 404, message: "Current book not found in graph index" };
  }

  const sourcePrice = Number(sourceNode.product.price) || 0;
  const candidates = [];
  const seen = new Set([String(currentProductId)]);

  if (intent === "same_author" || intent === "same_category") {
    const relType = intent === "same_author" ? GRAPH_RELATION_TYPES.WRITTEN_BY : GRAPH_RELATION_TYPES.BELONGS_TO;
    const rels = await GraphRelation.find({
      tenantId: scopedTenantId,
      sourceId: sourceBookId,
      type: relType,
    }).lean();
    if (rels.length) {
      const targetIds = rels.map((r) => r.targetId);
      const backRels = await GraphRelation.find({
        tenantId: scopedTenantId,
        targetId: { $in: targetIds },
        type: relType,
      }).lean();
      for (const rel of backRels) {
        const entity = await GraphEntity.findOne({
          tenantId: scopedTenantId,
          entityId: rel.sourceId,
          type: "Book",
        }).lean();
        if (!entity || seen.has(entity.refId)) continue;
        const p = await catalogClient.getProductDetails(entity.refId, scopedTenantId);
        if (!p) continue;
        seen.add(entity.refId);
        const reason =
          intent === "same_author"
            ? `Cung tac gia voi cuon hien tai.`
            : `Cung the loai voi cuon hien tai.`;
        candidates.push({
          product: p,
          reason,
          graphPath: [sourceBookId, rel.targetId, rel.sourceId],
          score: scoreCandidate({
            relationType: relType,
            product: p,
            intent,
            currentPrice: sourcePrice,
          }),
        });
      }
    }
  }

  if (intent === "product_relationship" || intent === "explain_recommendation") {
    const rels = await GraphRelation.find({
      tenantId: scopedTenantId,
      sourceId: sourceBookId,
      type: GRAPH_RELATION_TYPES.SIMILAR_TO,
    })
      .sort({ "metadata.score": -1 })
      .limit(limit * 2)
      .lean();
    for (const rel of rels) {
      const entity = await GraphEntity.findOne({
        tenantId: scopedTenantId,
        entityId: rel.targetId,
        type: "Book",
      }).lean();
      if (!entity || seen.has(entity.refId)) continue;
      const p = await catalogClient.getProductDetails(entity.refId, scopedTenantId);
      if (!p) continue;
      seen.add(entity.refId);
      candidates.push({
        product: p,
        reason: "Lien quan theo do thi similar_to.",
        graphPath: [sourceBookId, rel.targetId],
        score: scoreCandidate({
          relationType: GRAPH_RELATION_TYPES.SIMILAR_TO,
          product: p,
          intent,
          currentPrice: sourcePrice,
        }),
      });
    }
  }

  if (intent === "cheaper") {
    const allBooks = await GraphEntity.find({ tenantId: scopedTenantId, type: "Book" }).lean();
    for (const entity of allBooks) {
      if (!entity.refId || seen.has(entity.refId)) continue;
      const p = await catalogClient.getProductDetails(entity.refId, scopedTenantId);
      if (!p) continue;
      if (Number(p.price) >= sourcePrice) continue;
      if (String(p.type || "") !== String(sourceNode.product.type || "")) continue;
      seen.add(entity.refId);
      candidates.push({
        product: p,
        reason: "Gia thap hon va cung the loai voi cuon hien tai.",
        graphPath: [sourceBookId, `category:${sourceNode.product.type || ""}`, makeBookEntityId(entity.refId)],
        score: scoreCandidate({
          relationType: GRAPH_RELATION_TYPES.CHEAPER_THAN,
          product: p,
          intent,
          currentPrice: sourcePrice,
        }),
      });
    }
  }

  const ranked = candidates.sort((a, b) => b.score - a.score).slice(0, limit);
  return {
    ok: true,
    statusCode: 200,
    data: {
      source: sourceNode.product,
      recommendations: ranked.map((item) =>
        toProductCard(item.product, item.reason, item.graphPath, item.score)
      ),
    },
  };
};

module.exports = {
  graphTraverseRecommendations,
};

