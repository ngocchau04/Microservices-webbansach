const { analyzeQuery } = require("./queryUnderstandingService");

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const detectIntentDetailed = (raw = "", options = {}) => {
  const context = options.context && typeof options.context === "object" ? options.context : {};
  const analysis = options.analysis || analyzeQuery(raw, { context });
  const concepts = new Set(analysis.concepts || []);
  const n = analysis.normalizedQuery || "";

  const scores = {
    explain: 0,
    same_author: 0,
    same_category: 0,
    cheaper: 0,
    catalog_ranking: 0,
    related_next: 0,
    recommend: 0,
    search: 0.8,
  };

  if (concepts.has("explain")) {
    scores.explain += 8;
  }
  if (concepts.has("same_author")) {
    scores.same_author += 8;
  }
  if (concepts.has("same_category")) {
    scores.same_category += 8;
  }
  if (concepts.has("cheaper")) {
    scores.cheaper += 8;
  }
  if (
    concepts.has("sort_price_asc") ||
    concepts.has("sort_price_desc") ||
    concepts.has("sort_popularity_desc") ||
    concepts.has("sort_date_desc")
  ) {
    scores.catalog_ranking += 12;
  }
  if (concepts.has("related_next")) {
    scores.related_next += 8;
  }
  if (concepts.has("recommendation")) {
    scores.recommend += 4;
  }
  if (concepts.has("beginner")) {
    scores.recommend += 2.5;
  }
  if (concepts.has("frontend") || concepts.has("backend")) {
    scores.recommend += 2;
    scores.search += 1.2;
  }
  if (concepts.has("current_product_reference")) {
    scores.search += 1;
  }
  if (context.lastProductId) {
    if (scores.cheaper > 0 || /re hon|gia mem|gia re/.test(n)) {
      scores.cheaper += 2;
    }
    if (scores.same_category > 0) {
      scores.same_category += 1.5;
    }
    if (scores.same_author > 0) {
      scores.same_author += 1.5;
    }
  }

  if (/nen doc gi|co cuon nao|phu hop|danh cho/.test(n)) {
    scores.recommend += 2;
  }
  if (/tim sach|muon sach|sach ve|sach cho/.test(n)) {
    scores.search += 2;
  }
  if (/re hon|gia re|gia mem|thap hon/.test(n)) {
    scores.cheaper += 2.5;
  }
  if (/cung the loai|the loai giong|genre/.test(n)) {
    scores.same_category += 1.5;
  }
  if (/vi sao|tai sao|ly do/.test(n)) {
    scores.explain += 2;
  }

  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [intent, topScore] = ordered[0];
  const secondScore = ordered[1] ? ordered[1][1] : 0;
  const margin = Math.max(0, topScore - secondScore);
  const confidence = clamp((topScore + margin) / 12);
  const confidenceLabel = confidence >= 0.72 ? "high" : confidence >= 0.48 ? "medium" : "low";

  return {
    intent,
    confidence,
    confidenceLabel,
    scores,
    analysis,
  };
};

const detectIntent = (raw = "", options = {}) => detectIntentDetailed(raw, options).intent;

/**
 * When user asks policy/shipping/returns/contact — maps to default FAQ refIds in corpus.
 * Used with book context for graph traversal book → related_to → faq_topic.
 */
const detectPolicyIntent = (rawOrAnalysis = "", options = {}) => {
  const analysis =
    rawOrAnalysis && typeof rawOrAnalysis === "object" && rawOrAnalysis.normalizedQuery
      ? rawOrAnalysis
      : analyzeQuery(rawOrAnalysis, options);
  const concepts = new Set(analysis.concepts || []);
  const n = analysis.normalizedQuery || "";
  if (concepts.has("shipping_policy") || /van chuyen|giao hang|ship|delivery/.test(n)) {
    return { faqRefId: "shipping", badge: "policy_shipping" };
  }
  if (concepts.has("return_policy") || /doi tra|hoan tien|refund|tra hang/.test(n)) {
    return { faqRefId: "returns", badge: "policy_returns" };
  }
  if (concepts.has("support_contact") || /lien he|hotro|support|contact|ticket/.test(n)) {
    return { faqRefId: "contact", badge: "policy_contact" };
  }
  return null;
};

const detectHumanSupportIntent = (rawOrAnalysis = "", options = {}) => {
  const analysis =
    rawOrAnalysis && typeof rawOrAnalysis === "object" && rawOrAnalysis.normalizedQuery
      ? rawOrAnalysis
      : analyzeQuery(rawOrAnalysis, options);
  const concepts = new Set(analysis.concepts || []);
  const n = analysis.normalizedQuery || "";

  if (
    concepts.has("support_contact") &&
    /(lien he|nhan vien|nguoi ho tro|noi chuyen voi shop|gap nguoi|can nhan vien|tro giup truc tiep)/.test(n)
  ) {
    return true;
  }
  if (
    /(lien he nhan vien|gap nhan vien|gap nguoi ho tro|noi chuyen voi shop|toi can nhan vien|toi can nguoi ho tro)/.test(
      n
    )
  ) {
    return true;
  }
  return false;
};

const defaultFollowUpChips = () => [
  { id: "same_author", label: "Cùng tác giả" },
  { id: "same_category", label: "Cùng thể loại" },
  { id: "cheaper", label: "Sách rẻ hơn" },
  { id: "explain", label: "Tại sao bạn gợi ý?" },
  { id: "shipping", label: "Chính sách vận chuyển" },
  { id: "returns", label: "Đổi trả và hoàn tiền" },
];

const faqTopicChips = () => [
  { id: "shipping", label: "Chính sách vận chuyển" },
  { id: "returns", label: "Đổi trả và hoàn tiền" },
  { id: "contact", label: "Liên hệ hỗ trợ" },
];

module.exports = {
  detectIntent,
  detectIntentDetailed,
  detectPolicyIntent,
  detectHumanSupportIntent,
  defaultFollowUpChips,
  faqTopicChips,
};
