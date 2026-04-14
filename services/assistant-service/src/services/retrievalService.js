const { CorpusDocument } = require("../models/CorpusDocument");
const { analyzeQuery, normalize, tokenize, CONCEPT_DEFINITIONS } = require("./queryUnderstandingService");

const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const conceptKeywords = Object.entries(CONCEPT_DEFINITIONS).reduce((acc, [key, value]) => {
  const words = new Set();
  for (const alias of value.aliases || []) {
    words.add(normalize(alias));
  }
  for (const expansion of value.expansions || []) {
    words.add(normalize(expansion));
  }
  acc[key] = Array.from(words).filter(Boolean);
  return acc;
}, {});

const scoreDoc = ({ queryTokens = [], concepts = [], doc }) => {
  const hay = `${doc.title} ${doc.body} ${(doc.keywords || []).join(" ")} ${doc.normalizedText || ""}`;
  const hayNorm = normalize(hay);
  let lexicalScore = 0;
  let exactHitBonus = 0;
  for (const token of queryTokens) {
    if (!token) {
      continue;
    }
    if (hayNorm.includes(token)) {
      lexicalScore += 2.8;
      if (token.length >= 5) {
        exactHitBonus += 0.4;
      }
    }
  }
  let conceptScore = 0;
  for (const concept of concepts) {
    const kws = conceptKeywords[concept] || [];
    if (kws.some((kw) => kw && hayNorm.includes(kw))) {
      conceptScore += 2;
    }
  }
  const sourceBias = doc.sourceType === "faq" ? 0.6 : 0;
  return lexicalScore + conceptScore + exactHitBonus + sourceBias;
};

const findWithTextIndex = async (rawQuery) => {
  const q = (rawQuery || "").trim();
  if (!q) {
    return [];
  }
  try {
    const results = await CorpusDocument.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(12)
      .lean();
    return results;
  } catch {
    return [];
  }
};

const findWithTokens = async (queryTokens, concepts = []) => {
  if (!queryTokens.length) {
    return [];
  }

  const ors = queryTokens.flatMap((t) => {
    const rx = new RegExp(escapeRegex(t), "i");
    return [
      { normalizedText: rx },
      { title: rx },
      { body: rx },
      { keywords: t },
    ];
  });

  const docs = await CorpusDocument.find({ $or: ors }).limit(40).lean();

  const scored = docs
    .map((doc) => ({ doc, score: scoreDoc({ queryTokens, concepts, doc }) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.doc);
};

const retrieve = async (message, options = {}) => {
  const context = options.context && typeof options.context === "object" ? options.context : {};
  const analysis = options.analysis || analyzeQuery(message, { context });
  const queryTokens = analysis.expandedTokens || tokenize(analysis.rewrittenQuery || message);

  const candidateQueries = [
    (message || "").trim(),
    analysis.normalizedQuery || "",
    analysis.rewrittenQuery || "",
  ].filter(Boolean);

  const textMatches = [];
  for (const query of candidateQueries) {
    const found = await findWithTextIndex(query);
    if (found.length) {
      textMatches.push(...found);
    }
  }

  let docs = textMatches;
  if (!docs.length) {
    docs = await findWithTokens(queryTokens, analysis.concepts || []);
  }

  const unique = [];
  const seen = new Set();
  for (const d of docs) {
    const key = `${d.sourceType}:${d.refId}:${d.title}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(d);
    if (unique.length >= 10) {
      break;
    }
  }

  const rescored = unique
    .map((doc) => ({
      doc,
      score: scoreDoc({
        queryTokens,
        concepts: analysis.concepts || [],
        doc,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    queryTokens,
    docs: rescored.map((item) => item.doc),
    analysis,
    retrievalMeta: {
      topScore: rescored[0] ? rescored[0].score : 0,
      matchedCount: rescored.length,
      candidateQueries,
    },
  };
};

const mergeByRefId = (lists) => {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const doc of list) {
      if (!doc || seen.has(doc.refId)) {
        continue;
      }
      seen.add(doc.refId);
      out.push(doc);
    }
  }
  return out;
};

/**
 * Hybrid deterministic ranking (no embeddings): lexical + graph signals + popularity + optional price fit.
 */
const rankCatalogHybrid = (
  docs,
  { queryTokens = [], concepts = [], signalsByRefId = {}, referencePrice = null } = {}
) => {
  const hayFor = (doc) => {
    const meta = doc.metadata || {};
    return normalize(
      `${meta.title || ""} ${doc.body || ""} ${(doc.keywords || []).join(" ")} ${doc.title || ""}`
    );
  };
  const scored = docs.map((doc) => {
    const meta = doc.metadata || {};
    const sold = Number(meta.soldCount) || 0;
    const sigs = signalsByRefId[doc.refId] || [];
    const hay = hayFor(doc);
    let retrieval = 0;
    for (const t of queryTokens) {
      if (t && hay.includes(t)) {
        retrieval += 3;
      }
    }
    let conceptBoost = 0;
    for (const concept of concepts) {
      const kws = conceptKeywords[concept] || [];
      if (kws.some((kw) => kw && hay.includes(kw))) {
        conceptBoost += 1.4;
      }
    }
    let graphW = 0;
    if (sigs.includes("same_author")) {
      graphW += 12;
    }
    if (sigs.includes("same_category")) {
      graphW += 9;
    }
    if (sigs.includes("cheaper_in_category")) {
      graphW += 7;
    }
    if (sigs.includes("recommended_next")) {
      graphW += 5;
    }
    if (sigs.includes("lexical_primary")) {
      graphW += 14;
    }
    const popularity = Math.log10(sold + 1) * 2.2;
    let priceFit = 0;
    if (referencePrice != null && meta.price != null) {
      const p = Number(meta.price);
      const rp = Number(referencePrice);
      if (Number.isFinite(p) && Number.isFinite(rp) && p < rp) {
        priceFit += 4 * (1 - p / (rp + 1));
      }
    }
    const total = retrieval + conceptBoost + graphW + popularity + priceFit;
    return { doc, score: total };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
};

const pickRecommendations = async (queryTokens = [], concepts = []) => {
  const docs = await CorpusDocument.find({ sourceType: "catalog" }).limit(120).lean();
  const ranked = rankCatalogHybrid(docs, { queryTokens, concepts, signalsByRefId: {} });
  return ranked.slice(0, 6).map((x) => x.doc);
};

module.exports = {
  retrieve,
  pickRecommendations,
  rankCatalogHybrid,
  mergeByRefId,
  tokenize,
  normalize,
};
