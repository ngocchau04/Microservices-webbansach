const { retrieve, pickRecommendations, rankCatalogHybrid, mergeByRefId, findRankedCatalog } = require("./retrievalService");
const {
  detectIntent,
  detectIntentDetailed,
  detectPolicyIntent,
  detectHumanSupportIntent,
  defaultFollowUpChips,
  faqTopicChips,
} = require("./assistantIntents");
const { analyzeQuery } = require("./queryUnderstandingService");
const { createOrOpenSupportHandoff } = require("./supportHandoffService");
const { runLiveCatalogFallback } = require("./liveCatalogFallbackService");
const { graphTraverseRecommendations } = require("./graphTraversalService");
const {
  findSameAuthor,
  findSameCategory,
  findCheaperInCategory,
  findCatalogByProductId,
  explainMatch,
  traverseSameAuthorFromBook,
  traverseSameCategoryFromBook,
  traverseBookToFaqTopic,
  inferRecommendedNext,
  RELATION_KINDS,
} = require("./graphService");
const { CorpusDocument } = require("../models/CorpusDocument");
const { normalizeTenantId } = require("./tenantContextService");
const { buildAdminCopilotChatResult, isAdminCopilotContext } = require("./adminCopilotService");
const catalogClient = require("../utils/catalogClient");

const FALLBACK_MESSAGE =
  "Mình chưa đủ tự tin để trả lời chắc chắn từ dữ liệu Bookie hiện tại. Bạn có thể nói rõ hơn theo tác giả, thể loại, mức giá, hoặc mục tiêu học để mình gợi ý đúng hơn.";

const formatPrice = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "";
  }
  try {
    return `${Number(value).toLocaleString("vi-VN")} đ`;
  } catch {
    return `${value}`;
  }
};

const toSource = (doc) => {
  const excerpt = (doc.body || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const full = (doc.body || "").replace(/\s+/g, " ").trim();
  return {
    type: doc.sourceType,
    id: doc.refId || "",
    label: doc.title,
    excerpt: excerpt.length < full.length ? `${excerpt}…` : excerpt,
  };
};

const BADGE = {
  same_author: "Cùng tác giả",
  same_category: "Cùng thể loại",
  cheaper: "Giá mềm hơn",
  policy: "Liên kết chính sách",
  lexical: "Khớp từ khóa",
  popular: "Bán chạy",
  related: "Gợi ý liên quan",
};

const mapRecommendation = (doc, reasonTag = "", extra = {}) => {
  const meta = doc.metadata || {};
  const id = meta.productId || doc.refId;
  const badges = Array.isArray(extra.badges) ? extra.badges : [];
  return {
    productId: id,
    title: meta.title || doc.title?.replace(/^Sách:\s*/, "") || "Sách",
    author: meta.author,
    price: meta.price,
    imgSrc: meta.imgSrc,
    reasonTag,
    reasonLine: extra.reasonLine || "",
    graphBadges: badges,
    detailPath: id ? `/book/${id}` : "",
  };
};

const buildSessionHints = (recs, focusDoc) => {
  const top = recs[0] || focusDoc;
  if (!top) {
    return {};
  }
  const meta = top.metadata || top;
  const g = meta.graph || (focusDoc && focusDoc.metadata && focusDoc.metadata.graph) || {};
  const pid = meta.productId || top.refId || top.productId;
  return {
    focusProductId: pid ? String(pid) : "",
    focusAuthorKey: g.authorKey || "",
    focusCategoryKey: g.categoryKey || "",
  };
};

const composeMessage = ({ mainAnswer, whyExplanation, followUpChips }) => {
  let m = mainAnswer;
  // Bỏ phần tự động nối whyExplanation vào tin nhắn chính trong môi trường deploy
  if (followUpChips && followUpChips.length) {
    m += `\n\n👉 Bạn có thể hỏi tiếp: ${followUpChips.map((c) => c.label).join(" · ")}`;
  }
  return m.trim();
};

const wantsRecommendationHeuristic = (raw = "") => {
  const n = raw.toLowerCase();
  return (
    /gợi ý|đề xuất|bán chạy|best|recommend|similar|tương tự|tìm sách|tim sach/.test(n) ||
    n.includes("nên mua")
  );
};

const buildClarifyFallback = ({ intentInfo, analysis }) => {
  const concepts = new Set((analysis && analysis.concepts) || []);
  const samples = [];
  if (concepts.has("frontend") || concepts.has("beginner")) {
    samples.push("Gợi ý sách frontend/React cho người mới");
  }
  if (concepts.has("backend")) {
    samples.push("Có sách Node.js backend nào dễ học không?");
  }
  if (concepts.has("current_product_reference")) {
    samples.push("Cuốn này có bản cùng thể loại mà rẻ hơn không?");
  }
  if (concepts.has("shipping_policy")) {
    samples.push("Ship cuốn này mất bao lâu và phí thế nào?");
  }
  if (concepts.has("return_policy")) {
    samples.push("Nếu không ưng thì đổi trả trong bao lâu?");
  }
  if (!samples.length) {
    samples.push(
      "Gợi ý sách cho sinh viên IT",
      "Sách cùng tác giả của cuốn này",
      "Có sách nào cùng thể loại mà rẻ hơn không?"
    );
  }
  const confidenceLine =
    intentInfo && intentInfo.confidenceLabel === "low"
      ? "Mình chưa chắc bạn đang muốn tìm theo tác giả, thể loại, hay mức giá."
      : "Mình cần thêm một chút ngữ cảnh để gợi ý đúng hơn.";
  return `${confidenceLine}\n\nBạn có thể hỏi theo các cách sau:\n- ${samples.slice(0, 3).join("\n- ")}`;
};

const tagSignalsForMerged = (catalogDocs, authorDocs, categoryDocs, cheaperDocs, focusRefId) => {
  const signalsByRefId = {};
  const add = (ref, sig) => {
    if (!ref) {
      return;
    }
    if (!signalsByRefId[ref]) {
      signalsByRefId[ref] = [];
    }
    if (!signalsByRefId[ref].includes(sig)) {
      signalsByRefId[ref].push(sig);
    }
  };
  for (const d of catalogDocs) {
    add(d.refId, "lexical_primary");
  }
  for (const d of authorDocs) {
    if (d.refId !== focusRefId) {
      add(d.refId, "same_author");
    }
  }
  for (const d of categoryDocs) {
    if (d.refId !== focusRefId) {
      add(d.refId, "same_category");
    }
  }
  for (const d of cheaperDocs) {
    add(d.refId, "cheaper_in_category");
  }
  return signalsByRefId;
};

const reasonLineFromSignals = (refId, signalsByRefId) => {
  const s = signalsByRefId[refId] || [];
  if (s.includes("lexical_primary")) {
    return "Khớp từ khóa trên chỉ mục + điểm phổ biến.";
  }
  if (s.includes("same_author") && s.includes("same_category")) {
    return "Mở rộng theo cùng tác giả và cùng thể loại trên đồ thị metadata.";
  }
  if (s.includes("same_author")) {
    return "Mở rộng từ cuốn trọng tâm theo quan hệ cùng tác giả (authored_by).";
  }
  if (s.includes("same_category")) {
    return "Cùng thể loại (belongs_to) và ưu tiên mức bán.";
  }
  if (s.includes("cheaper_in_category")) {
    return "Giá thấp hơn trong cùng nhóm thể loại.";
  }
  return "";
};

const badgesFromSignals = (refId, signalsByRefId) => {
  const s = signalsByRefId[refId] || [];
  const b = [];
  if (s.includes("same_author")) {
    b.push(BADGE.same_author);
  }
  if (s.includes("same_category")) {
    b.push(BADGE.same_category);
  }
  if (s.includes("cheaper_in_category")) {
    b.push(BADGE.cheaper);
  }
  if (s.includes("lexical_primary")) {
    b.push(BADGE.lexical);
  }
  return b;
};

const chatInternal = async ({ message, context = {}, actor = null, tenantId = "public", config = {} }) => {
  const scopedTenantId = normalizeTenantId(tenantId, config.defaultTenantId || "public");
  const trimmed = (message || "").trim();
  if (!trimmed) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        message: "Bạn nhập câu hỏi hoặc chọn một gợi ý nhé.",
        mainAnswer: "Bạn nhập câu hỏi hoặc chọn một gợi ý nhé.",
        whyExplanation: null,
        followUpChips: defaultFollowUpChips().slice(0, 5),
        sources: [],
        recommendations: [],
        sessionHints: {},
        graphReasoningInfo: null,
        fallback: true,
      },
    };
  }

  /** Admin support copilot — isolated from customer book/chat retrieval & handoff heuristics */
  if (isAdminCopilotContext(context)) {
    const payload = buildAdminCopilotChatResult({
      message: trimmed,
      context,
      tenantId: scopedTenantId,
    });
    return {
      ok: true,
      statusCode: 200,
      data: payload,
    };
  }

  const queryAnalysis = analyzeQuery(trimmed, { context });
  const intentInfo = detectIntentDetailed(trimmed, { analysis: queryAnalysis, context });
  const intent = intentInfo.intent || detectIntent(trimmed, { analysis: queryAnalysis, context });
  const policyHint = detectPolicyIntent(queryAnalysis);
  const wantsHumanSupport = detectHumanSupportIntent(queryAnalysis);
  const graphIntentMap = {
    same_author: "same_author",
    same_category: "same_category",
    cheaper: "cheaper",
    explain: "explain_recommendation",
    related_next: "product_relationship",
  };

  const graphIntent = graphIntentMap[intent] || null;
  const currentProductId = String(
    context.currentProductId || context.lastProductId || ""
  ).trim();

  if (graphIntent && currentProductId) {
    const graphResult = await graphTraverseRecommendations({
      tenantId: scopedTenantId,
      currentProductId,
      intent: graphIntent,
      limit: 5,
    });
    if (graphResult.ok && Array.isArray(graphResult.data?.recommendations)) {
      const recs = graphResult.data.recommendations;
      if (recs.length > 0) {
        const mainAnswer =
          graphIntent === "same_author"
            ? "Mình tìm thấy một số sách cùng tác giả với cuốn hiện tại:"
            : graphIntent === "same_category"
            ? "Mình tìm thấy một số sách cùng thể loại với cuốn hiện tại:"
            : graphIntent === "cheaper"
            ? "Mình tìm thấy một số sách rẻ hơn trong cùng nhóm liên quan:"
            : "Mình tìm thấy các sách liên quan theo đồ thị tri thức:";
        const payload = {
          mainAnswer,
          whyExplanation:
            graphIntent === "explain_recommendation"
              ? "Mình truy vết trên đồ thị Book -> Author/Category/Tag và cộng điểm tồn kho, rating, giá."
              : null,
          followUpChips: defaultFollowUpChips().slice(0, 6),
          sources: [],
          recommendations: recs,
          sessionHints: {
            focusProductId: recs[0]?.productId || currentProductId,
            lastProductId: recs[0]?.productId || currentProductId,
          },
          graphReasoningInfo: {
            type: "graph_recommendation",
            expandedBy: graphIntent,
            pathsUsed: recs.slice(0, 3).map((r) => ({
              op: "graph_path",
              path: r.graphPath || [],
            })),
          },
          fallback: false,
        };
        return {
          ok: true,
          statusCode: 200,
          data: { ...payload, message: composeMessage(payload) },
        };
      }
    }
  }

  const liveFallback = await runLiveCatalogFallback({
    message: trimmed,
    intent: policyHint
      ? policyHint.faqRefId === "shipping"
        ? "shipping_policy"
        : policyHint.faqRefId === "returns"
        ? "return_policy"
        : intent
      : intent,
    analysis: queryAnalysis,
    context,
    tenantId: scopedTenantId,
  });
  if (liveFallback) {
    return liveFallback;
  }

  const { queryTokens, queryEmbedding, docs, retrievalMeta } = await retrieve(trimmed, {
    analysis: queryAnalysis,
    context,
    tenantId: scopedTenantId,
  });

  if (wantsHumanSupport) {
    if (!String(actor?.userId || "").trim()) {
      const payload = {
        mainAnswer:
          "Mình đã hiểu bạn muốn gặp nhân viên hỗ trợ. Để chuyển cuộc trò chuyện cho nhân viên, bạn vui lòng đăng nhập trước nhé.",
        whyExplanation: null,
        followUpChips: [
          { id: "support_login_required", label: "Dang nhap de lien he nhan vien ho tro" },
          { id: "shipping", label: "Chinh sach van chuyen" },
          { id: "returns", label: "Doi tra va hoan tien" },
        ],
        sources: [],
        recommendations: [],
        sessionHints: {},
        graphReasoningInfo: { pathsUsed: [{ op: "handoff_login_required" }] },
        handoff: {
          mode: "bot_only",
          state: "bot_only",
          conversationId: "",
        },
        fallback: true,
      };
      return {
        ok: true,
        statusCode: 200,
        data: { ...payload, message: composeMessage(payload) },
      };
    }
    const handoffResult = await createOrOpenSupportHandoff({
      config,
      context: {
        ...context,
        userId: String(actor?.userId || "").trim(),
        userEmail: String(actor?.email || context.userEmail || "").trim(),
      },
      message: trimmed,
      analysis: queryAnalysis,
      intentInfo,
      tenantId: scopedTenantId,
    });
    if (handoffResult.ok) {
      const conversation = handoffResult.data?.conversation || null;
      const handoff = handoffResult.data?.handoff || null;
      const payload = {
        mainAnswer: "Mình đã chuyển yêu cầu của bạn cho nhân viên hỗ trợ. Vui lòng chờ phản hồi.",
        whyExplanation:
          "Bạn vừa yêu cầu gặp nhân viên hỗ trợ nên mình chuyển hội thoại sang chế độ hỗ trợ bởi người thật.",
        followUpChips: [
          { id: "wait_human", label: "Tôi sẽ chờ phản hồi từ nhân viên" },
          { id: "shipping", label: "Trong lúc chờ: Chính sách vận chuyển" },
          { id: "returns", label: "Trong lúc chờ: Đổi trả và hoàn tiền" },
        ],
        sources: [],
        recommendations: [],
        sessionHints: {
          ...buildSessionHints([], null),
          supportConversationId: conversation?._id || handoff?.conversationId || "",
          supportState: handoff?.state || conversation?.handoffState || "waiting_human",
        },
        graphReasoningInfo: {
          pathsUsed: [{ op: "handoff_to_human_support", intent: intentInfo.intent }],
          focusEntity: conversation ? `support:${conversation._id}` : null,
        },
        handoff: {
          mode: "human",
          state: handoff?.state || conversation?.handoffState || "waiting_human",
          conversationId: handoff?.conversationId || conversation?._id || "",
        },
        fallback: false,
      };
      return {
        ok: true,
        statusCode: 200,
        data: { ...payload, message: composeMessage(payload) },
      };
    }
  }

  const catalogDocs = docs.filter((d) => d.sourceType === "catalog");
  const faqDocs = docs.filter((d) => d.sourceType === "faq");
  const supportDocs = docs.filter((d) => d.sourceType === "support");

  let focusDoc = null;
  if (context.lastProductId) {
    focusDoc = await findCatalogByProductId(context.lastProductId, scopedTenantId);
  }
  if (!focusDoc && catalogDocs[0]) {
    focusDoc = catalogDocs[0];
  }
  if (!focusDoc && context.focusAuthorKey && intent === "same_author") {
    const list = await findSameAuthor(context.focusAuthorKey, {
      tenantId: scopedTenantId,
      limit: 1,
    });
    focusDoc = list[0] || null;
  }

  const gFocus = (focusDoc && focusDoc.metadata && focusDoc.metadata.graph) || {};
  const authorKey =
    context.focusAuthorKey || gFocus.authorKey || catalogDocs[0]?.metadata?.graph?.authorKey;
  const categoryKey =
    context.focusCategoryKey || gFocus.categoryKey || catalogDocs[0]?.metadata?.graph?.categoryKey;

  /** Policy / FAQ qua cạnh đồ thị khi có ngữ cảnh sách */
  if (policyHint && focusDoc) {
    let graph = await traverseBookToFaqTopic(focusDoc, policyHint.faqRefId, scopedTenantId);
    let faqDoc = graph.doc;
    let usedGraphEdge = !!faqDoc;
    if (!faqDoc) {
      faqDoc = await CorpusDocument.findOne({
        tenantId: scopedTenantId,
        sourceType: "faq",
        refId: policyHint.faqRefId,
      }).lean();
    }
    if (faqDoc) {
      const metaTitle = focusDoc.metadata?.title || focusDoc.title;
      const why = usedGraphEdge
        ? `Mình mở rộng từ cuốn “${metaTitle}” (${focusDoc.refId}) theo cạnh related_to → faq_topic:${policyHint.faqRefId}, rồi lấy đúng đoạn FAQ đã chỉ mục.`
        : `Chưa thấy cạnh related_to trên metadata sách (có thể cần reindex); vẫn trả FAQ refId=${policyHint.faqRefId} để an toàn và bám nguồn.`;
      const chips = [...faqTopicChips(), ...defaultFollowUpChips().slice(0, 2)];
      const graphReasoningInfo = {
        pathsUsed: usedGraphEdge
          ? graph.steps
          : [{ note: "fallback_direct_faq", refId: policyHint.faqRefId }],
        focusEntity: `book:${focusDoc.refId}`,
        policyBadge: policyHint.badge,
      };
      const payload = {
        mainAnswer: faqDoc.body.trim(),
        whyExplanation: why,
        followUpChips: chips,
        sources: [toSource(faqDoc)],
        recommendations: [],
        sessionHints: buildSessionHints([focusDoc], focusDoc),
        graphReasoningInfo,
        fallback: false,
      };
      return {
        ok: true,
        statusCode: 200,
        data: { ...payload, message: composeMessage(payload) },
      };
    }
  }

  /** ---------- Intent: explain ---------- */
  if (intent === "explain") {
    const refDoc = focusDoc || catalogDocs[0];
    const why = explainMatch(trimmed, refDoc);
    const chips = defaultFollowUpChips().slice(0, 4);
    const main = refDoc
      ? `Dưới đây là một số thông tin chi tiết giúp bạn chọn sách:`
      : `Chưa có cuốn sách nào được chọn để phân tích. Hãy hỏi về một tựa sách cụ thể nhé!`;
    const graphReasoningInfo = refDoc
      ? {
          pathsUsed: [
            { op: "lexical_retrieval", query: trimmed.slice(0, 120) },
            { op: "read_graph_node", bookId: refDoc.refId },
          ],
          focusEntity: refDoc ? `book:${refDoc.refId}` : null,
        }
      : null;
    const payload = {
      mainAnswer: main,
      whyExplanation: why,
      followUpChips: chips,
      sources: refDoc ? [toSource(refDoc)] : [],
      recommendations: refDoc ? [mapRecommendation(refDoc, "Đang xem", { badges: [BADGE.lexical] })] : [],
      sessionHints: buildSessionHints(refDoc ? [refDoc] : [], refDoc),
      graphReasoningInfo,
      fallback: !refDoc,
    };
    return {
      ok: true,
      statusCode: 200,
      data: {
        ...payload,
        message: composeMessage(payload),
      },
    };
  }

  /** ---------- Intent: same author ---------- */
  if (intent === "same_author") {
    const ak = authorKey;
    if (!ak) {
      const payload = {
        mainAnswer:
          "Mình chưa xác định được tác giả để lọc “cùng tác giả”. Hãy hỏi tên sách hoặc tác giả trước, hoặc chọn gợi ý sách.",
        whyExplanation: null,
        followUpChips: defaultFollowUpChips().slice(0, 5),
        sources: [],
        recommendations: [],
        sessionHints: {},
        graphReasoningInfo: null,
        fallback: true,
      };
      return {
        ok: true,
        statusCode: 200,
        data: { ...payload, message: composeMessage(payload) },
      };
    }
    let tr;
    if (focusDoc) {
      tr = await traverseSameAuthorFromBook(focusDoc, {
        tenantId: scopedTenantId,
        excludeRefId: focusDoc.refId,
        limit: 10,
      });
    } else {
      const docs = await findSameAuthor(ak, {
        tenantId: scopedTenantId,
        excludeRefId: null,
        limit: 10,
      });
      tr = {
        docs,
        steps: [
          {
            op: "expand_catalog",
            by: "session_or_retrieval_authorKey",
            value: ak,
          },
        ],
        pathDescription: `author:${ak} → (catalog cùng authorKey)`,
      };
    }
    const signals = tagSignalsForMerged([], tr.docs, [], [], focusDoc?.refId);
    const ranked = rankCatalogHybrid(tr.docs, {
      queryTokens,
      concepts: queryAnalysis.concepts,
      signalsByRefId: signals,
      queryEmbedding,
    });
    const top = ranked.slice(0, 4).map((x) => x.doc);
    const recs = top.map((d) =>
      mapRecommendation(d, BADGE.same_author, {
        reasonLine: reasonLineFromSignals(d.refId, signals),
        badges: badgesFromSignals(d.refId, signals),
      })
    );
    const main = `Dưới đây là một số tác phẩm khác cùng tác giả mà bạn có thể yêu thích:`;
    const why = `Mình mở rộng từ cuốn bạn đang quan tâm theo quan hệ cùng tác giả (khóa “${ak}”), rồi xếp hạng từ khóa + đồ thị + soldCount.`;
    const chips = [
      { id: "same_category", label: "Cùng thể loại" },
      { id: "cheaper", label: "Sách rẻ hơn" },
      { id: "explain", label: "Tại sao bạn gợi ý?" },
      ...faqTopicChips().slice(0, 2),
    ];
    const graphReasoningInfo = {
      pathsUsed: tr.steps,
      focusEntity: focusDoc ? `book:${focusDoc.refId}` : `author:${ak}`,
      expandedBy: "same_author",
    };
    const payload = {
      mainAnswer: main,
      whyExplanation: why,
      followUpChips: chips,
      sources: top.slice(0, 3).map(toSource),
      recommendations: recs,
      sessionHints: buildSessionHints(top, focusDoc || top[0]),
      graphReasoningInfo,
      fallback: recs.length === 0,
    };
    if (recs.length === 0) {
      payload.mainAnswer = `${FALLBACK_MESSAGE}\n\nKhông còn đầu sách khác cùng tác giả trong kho đã chỉ mục.`;
    }
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }

  /** ---------- Intent: same category ---------- */
  if (intent === "same_category") {
    const ck = categoryKey;
    if (!ck) {
      const payload = {
        mainAnswer:
          "Chưa có thể loại để lọc. Hãy hỏi về một cuốn sách cụ thể trước (hệ thống dùng mã thể loại nội bộ).",
        whyExplanation: null,
        followUpChips: defaultFollowUpChips().slice(0, 5),
        sources: [],
        recommendations: [],
        sessionHints: {},
        graphReasoningInfo: null,
        fallback: true,
      };
      return {
        ok: true,
        statusCode: 200,
        data: { ...payload, message: composeMessage(payload) },
      };
    }
    let tr;
    if (focusDoc) {
      tr = await traverseSameCategoryFromBook(focusDoc, {
        tenantId: scopedTenantId,
        excludeRefId: focusDoc.refId,
        limit: 10,
      });
    } else {
      const docs = await findSameCategory(ck, {
        tenantId: scopedTenantId,
        excludeRefId: null,
        limit: 10,
      });
      tr = {
        docs,
        steps: [
          {
            op: "expand_catalog",
            by: "session_or_retrieval_categoryKey",
            value: ck,
          },
        ],
        pathDescription: `category:${ck} → (catalog cùng categoryKey)`,
      };
    }
    const signals = tagSignalsForMerged([], [], tr.docs, [], focusDoc?.refId);
    const ranked = rankCatalogHybrid(tr.docs, {
      queryTokens,
      concepts: queryAnalysis.concepts,
      signalsByRefId: signals,
      queryEmbedding,
    });
    const top = ranked.slice(0, 4).map((x) => x.doc);
    const recs = top.map((d) =>
      mapRecommendation(d, BADGE.same_category, {
        reasonLine: reasonLineFromSignals(d.refId, signals),
        badges: badgesFromSignals(d.refId, signals),
      })
    );
    const main = `Gợi ý các đầu sách cùng thể loại bạn đang quan tâm:`;
    const why = `Mình chọn các sách này vì chúng thuộc cùng thể loại “${ck}” và đang có mức bán tốt (soldCount) sau khi ghép điểm hybrid.`;
    const chips = [
      { id: "same_author", label: "Cùng tác giả" },
      { id: "explain", label: "Tại sao bạn gợi ý?" },
      ...faqTopicChips().slice(0, 2),
    ];
    const graphReasoningInfo = {
      pathsUsed: tr.steps,
      focusEntity: focusDoc ? `book:${focusDoc.refId}` : `category:${ck}`,
      expandedBy: "same_category",
    };
    const payload = {
      mainAnswer: main,
      whyExplanation: why,
      followUpChips: chips,
      sources: top.slice(0, 3).map(toSource),
      recommendations: recs,
      sessionHints: buildSessionHints(top, focusDoc || top[0]),
      graphReasoningInfo,
      fallback: recs.length === 0,
    };
    if (recs.length === 0) {
      payload.mainAnswer = `${FALLBACK_MESSAGE}\n\nKhông có thêm sách cùng thể loại trong kho đã chỉ mục.`;
    }
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }

  /** ---------- Intent: cheaper ---------- */
  if (intent === "cheaper") {
    const anchor = focusDoc || catalogDocs[0];
    const ck = categoryKey || anchor?.metadata?.graph?.categoryKey;
    const refPrice = anchor?.metadata?.price;
    if (!ck || refPrice === undefined || !anchor) {
      const payload = {
        mainAnswer: "Để gợi ý sách rẻ hơn trong cùng thể loại, hãy chọn hoặc hỏi về một cuốn có giá cụ thể trước.",
        whyExplanation: null,
        followUpChips: defaultFollowUpChips().slice(0, 5),
        sources: [],
        recommendations: [],
        sessionHints: buildSessionHints([], focusDoc),
        graphReasoningInfo: null,
        fallback: true,
      };
      return {
        ok: true,
        statusCode: 200,
        data: { ...payload, message: composeMessage(payload) },
      };
    }
    const cheapRaw = await findCheaperInCategory(ck, refPrice, {
      tenantId: scopedTenantId,
      excludeRefId: anchor?.refId,
      limit: 12,
    });
    const signals = tagSignalsForMerged([], [], [], cheapRaw, anchor.refId);
    const ranked = rankCatalogHybrid(cheapRaw, {
      queryTokens,
      concepts: queryAnalysis.concepts,
      signalsByRefId: signals,
      referencePrice: refPrice,
      queryEmbedding,
    });
    const top = ranked.slice(0, 4).map((x) => x.doc);
    const recs = top.map((d) =>
      mapRecommendation(d, BADGE.cheaper, {
        reasonLine: reasonLineFromSignals(d.refId, signals),
        badges: [BADGE.cheaper, BADGE.same_category],
      })
    );
    const main =
      recs.length > 0
        ? `Các tựa sách cùng thể loại có mức giá tối ưu hơn (dưới ${formatPrice(refPrice)}):`
        : `Hiện chưa tìm thấy tựa sách nào cùng thể loại có giá thấp hơn trong kho.`;
    const why = recs.length
      ? `Lọc theo quan hệ ${RELATION_KINDS.BELONGS_TO} → “${ck}”, áp dụng ràng buộc metadata.price < ${formatPrice(refPrice)}, rồi xếp hạng hybrid (bao gồm độ “mềm” giá).`
      : null;
    const graphReasoningInfo = {
      pathsUsed: [
        { edge: RELATION_KINDS.BELONGS_TO, categoryKey: ck },
        { op: "filter_cheaper_in_category", refPrice },
      ],
      focusEntity: `book:${anchor.refId}`,
    };
    const payload = {
      mainAnswer: main,
      whyExplanation: why,
      followUpChips: defaultFollowUpChips().slice(0, 5),
      sources: top.slice(0, 2).map(toSource),
      recommendations: recs,
      sessionHints: buildSessionHints(top, anchor),
      graphReasoningInfo,
      fallback: recs.length === 0,
    };
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }

  /** ---------- Intent: related_next ---------- */
  if (intent === "related_next") {
    const fd = focusDoc || catalogDocs[0];
    if (!fd) {
      const payload = {
        mainAnswer: "Chưa có cuốn trọng tâm trong phiên. Hãy chọn sách hoặc hỏi tên sách trước.",
        whyExplanation: null,
        followUpChips: defaultFollowUpChips().slice(0, 5),
        sources: [],
        recommendations: [],
        sessionHints: {},
        graphReasoningInfo: null,
        fallback: true,
      };
      return {
        ok: true,
        statusCode: 200,
        data: { ...payload, message: composeMessage(payload) },
      };
    }
    const ta = await traverseSameAuthorFromBook(fd, {
      tenantId: scopedTenantId,
      excludeRefId: fd.refId,
      limit: 5,
    });
    const tc = await traverseSameCategoryFromBook(fd, {
      tenantId: scopedTenantId,
      excludeRefId: fd.refId,
      limit: 6,
    });
    const inf = await inferRecommendedNext(fd, {
      tenantId: scopedTenantId,
      excludeRefId: fd.refId,
      limit: 4,
    });
    const merged = mergeByRefId([ta.docs, tc.docs, inf.docs]);
    const signals = tagSignalsForMerged([], ta.docs, tc.docs, [], fd.refId);
    for (const d of inf.docs) {
      if (!signals[d.refId]) {
        signals[d.refId] = [];
      }
      if (!signals[d.refId].includes("recommended_next")) {
        signals[d.refId].push("recommended_next");
      }
      if (!signals[d.refId].includes("same_category")) {
        signals[d.refId].push("same_category");
      }
    }
    const ranked = rankCatalogHybrid(merged, {
      queryTokens,
      concepts: queryAnalysis.concepts,
      signalsByRefId: signals,
      queryEmbedding,
    });
    const top = ranked.slice(0, 4).map((x) => x.doc);
    const recs = top.map((d) =>
      mapRecommendation(d, BADGE.related, {
        reasonLine: reasonLineFromSignals(d.refId, signals),
        badges: badgesFromSignals(d.refId, signals),
      })
    );
    const main =
      recs.length > 0
        ? `Nếu bạn yêu thích cuốn này, có thể bạn sẽ muốn xem thêm các đầu sách liên quan:`
        : `Bạn có thể thử hỏi về một chủ đề khác hoặc tên sách cụ thể nhé.`;
    const graphReasoningInfo = {
      pathsUsed: [...ta.steps, ...tc.steps, { note: inf.pathDescription }],
      focusEntity: `book:${fd.refId}`,
      expandedBy: "related_next",
    };
    const payload = {
      mainAnswer: main,
      whyExplanation: recs.length
        ? `Kết hợp mở rộng đồ thị từ “${fd.metadata?.title || fd.title}” và xếp hạng hybrid (không embedding).`
        : null,
      followUpChips: defaultFollowUpChips().slice(0, 6),
      sources: top.slice(0, 3).map(toSource),
      recommendations: recs,
      sessionHints: buildSessionHints(top, fd),
      graphReasoningInfo,
      fallback: recs.length === 0,
    };
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }

  /** ---------- Smart Filters (Cheapest, Expensive, Popular, Newest) ---------- */
  if (intent === "catalog_ranking") {
    const recDocs = await findRankedCatalog({
      tenantId: scopedTenantId,
      concepts: queryAnalysis.concepts,
    });
    const recs = recDocs.map((d) => {
      let badge = BADGE.popular;
      let reason = "Gợi ý hàng đầu theo tiêu chí của bạn.";
      if (queryAnalysis.concepts.includes("sort_price_asc")) {
        badge = "Giá tốt nhất";
        reason = "Cuốn sách có mức giá cạnh tranh nhất trong kho.";
      } else if (queryAnalysis.concepts.includes("sort_price_desc")) {
        badge = "Cao cấp";
        reason = "Tác phẩm giá trị nhất dành cho bạn.";
      } else if (queryAnalysis.concepts.includes("sort_date_desc")) {
        badge = "Mới về";
        reason = "Sách vừa được cập nhật vào kho dữ liệu.";
      } else if (queryAnalysis.concepts.includes("sort_popularity_desc")) {
        badge = "Bán chạy";
        reason = "Đang được rất nhiều độc giả quan tâm và chọn mua.";
      }
      return mapRecommendation(d, badge, {
        reasonLine: reason,
        badges: [badge],
      });
    });

    let main = "";
    if (queryAnalysis.concepts.includes("sort_price_asc")) {
      main = "Đây là những lựa chọn tiết kiệm nhất giúp bạn tối ưu chi phí:";
    } else if (queryAnalysis.concepts.includes("sort_price_desc")) {
      main = "Nếu bạn tìm kiếm những ấn phẩm giá trị và chất lượng cao nhất, đây là gợi ý:";
    } else if (queryAnalysis.concepts.includes("sort_date_desc")) {
      main = "Chào mừng những thành viên mới vừa cập bến kho sách của Bookie:";
    } else if (queryAnalysis.concepts.includes("sort_popularity_desc")) {
      main = "Dưới đây là các đầu sách đang tạo nên cơn sốt và được săn đón nhất:";
    } else {
      main = "Danh sách được sắp xếp tối ưu theo yêu cầu của bạn:";
    }

    if (recs.length === 0) main = FALLBACK_MESSAGE;

    const payload = {
      mainAnswer: main,
      whyExplanation: null,
      followUpChips: defaultFollowUpChips().slice(0, 6),
      sources: [],
      recommendations: recs,
      sessionHints: buildSessionHints(recDocs, recDocs[0]),
      graphReasoningInfo: {
        pathsUsed: [{ op: "smart_filter", concepts: queryAnalysis.concepts }],
      },
      fallback: recs.length === 0,
    };
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }

  /** ---------- Catalog keyword hits + graph expansion ---------- */
  if (catalogDocs.length) {
    const focus = catalogDocs[0];
    const ta = await traverseSameAuthorFromBook(focus, {
      tenantId: scopedTenantId,
      excludeRefId: focus.refId,
      limit: 8,
    });
    const tc = await traverseSameCategoryFromBook(focus, {
      tenantId: scopedTenantId,
      excludeRefId: focus.refId,
      limit: 8,
    });
    const merged = mergeByRefId([catalogDocs, ta.docs, tc.docs]);
    const signals = tagSignalsForMerged(catalogDocs, ta.docs, tc.docs, [], focus.refId);
    const ranked = rankCatalogHybrid(merged, {
      queryTokens,
      concepts: queryAnalysis.concepts,
      signalsByRefId: signals,
      referencePrice: focus.metadata?.price,
      queryEmbedding,
    });
    const top = ranked.slice(0, 6).map((x) => x.doc);
    const recs = top.map((d) =>
      mapRecommendation(d, BADGE.lexical, {
        reasonLine: reasonLineFromSignals(d.refId, signals),
        badges: badgesFromSignals(d.refId, signals),
      })
    );
    const main = `Dựa trên sở thích của bạn, mình đã chọn lọc ra các đầu sách phù hợp nhất:`;
    const why = `Retrieval: từ khóa trên tiêu đề/mô tả; mở rộng: từ sách “${focus.metadata?.title || focus.title}” (${focus.refId}) theo ${RELATION_KINDS.AUTHORED_BY} và ${RELATION_KINDS.BELONGS_TO}; hạng: khớp chữ + cạnh đồ thị + soldCount (+ giá nếu có).`;
    const graphReasoningInfo = {
      pathsUsed: [
        { op: "lexical_hit", focusRefId: focus.refId },
        ...ta.steps,
        ...tc.steps,
      ],
      focusEntity: `book:${focus.refId}`,
      expandedBy: "search_hybrid",
    };
    const payload = {
      mainAnswer: main,
      whyExplanation: why,
      followUpChips: defaultFollowUpChips().slice(0, 6),
      sources: top.slice(0, 4).map(toSource),
      recommendations: recs,
      sessionHints: buildSessionHints(top, focus),
      graphReasoningInfo,
      fallback: false,
    };
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }

  /** ---------- FAQ / policy (retrieval) ---------- */
  if (faqDocs.length) {
    const top = faqDocs[0];
    const main = top.body.trim();
    const topicKey = top.metadata?.graph?.topicKey || top.refId;
    const chips = [...faqTopicChips(), ...defaultFollowUpChips().slice(0, 2)];
    const graphReasoningInfo = {
      pathsUsed: [{ op: "lexical_faq_hit", refId: top.refId, topicKey }],
      focusEntity: `faq_topic:${top.refId}`,
    };
    const payload = {
      mainAnswer: main,
      whyExplanation: `Câu trả lời này được liên kết với chủ đề FAQ/policy (${topicKey}) trong corpus đã chỉ mục.`,
      followUpChips: chips,
      sources: [toSource(top)],
      recommendations: [],
      sessionHints: {},
      graphReasoningInfo,
      fallback: false,
    };
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage({ ...payload, followUpChips: chips }) },
    };
  }

  if (supportDocs.length) {
    const top = supportDocs[0];
    const payload = {
      mainAnswer: top.body.trim(),
      whyExplanation: "Nội dung hỗ trợ tĩnh đã lập chỉ mục.",
      followUpChips: faqTopicChips(),
      sources: [toSource(top)],
      recommendations: [],
      sessionHints: {},
      graphReasoningInfo: { pathsUsed: [{ op: "support_hit", refId: top.refId }] },
      fallback: false,
    };
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }


  /** ---------- recommend / bán chạy ---------- */
  if (intent === "recommend" || wantsRecommendationHeuristic(trimmed)) {
    const recDocs = await pickRecommendations(queryTokens, queryAnalysis.concepts, scopedTenantId);
    const recs = recDocs.map((d) =>
      mapRecommendation(d, BADGE.popular, {
        reasonLine: "Ưu tiên theo soldCount sau khi cộng điểm khớp từ khóa (nếu có).",
        badges: [BADGE.popular],
      })
    );
    const main =
      recs.length > 0
        ? `Một số đầu sách đang được ưu tiên gợi ý (xếp hạng hybrid: độ phổ biến + khớp từ khóa):`
        : FALLBACK_MESSAGE;
    const payload = {
      mainAnswer: main,
      whyExplanation: recs.length
        ? "Thứ hạng kết hợp soldCount (catalog) với điểm khớp từ khóa trên chỉ mục — minh bạch, không embedding."
        : null,
      followUpChips: defaultFollowUpChips().slice(0, 6),
      sources: [],
      recommendations: recs,
      sessionHints: buildSessionHints(recDocs, recDocs[0]),
      graphReasoningInfo: { pathsUsed: [{ op: "popular_pick", tokens: queryTokens.slice(0, 8) }] },
      fallback: recs.length === 0,
    };
    return {
      ok: true,
      statusCode: 200,
      data: { ...payload, message: composeMessage(payload) },
    };
  }

  /** ---------- Weak: fallback + popular ---------- */
  const recDocs = await pickRecommendations(queryTokens, queryAnalysis.concepts, scopedTenantId);
  const recs = recDocs.map((d) =>
    mapRecommendation(d, "Gợi ý tham khảo", {
      reasonLine: "Gợi ý tham khảo khi truy vấn mơ hồ.",
      badges: [BADGE.popular],
    })
  );
  const lowConfidence = (intentInfo && intentInfo.confidenceLabel === "low") || (retrievalMeta?.topScore || 0) < 3.2;
  const adaptiveFallback = buildClarifyFallback({ intentInfo, analysis: queryAnalysis });
  const payload = {
    mainAnswer: recs.length > 0 ? `${lowConfidence ? adaptiveFallback : FALLBACK_MESSAGE}\n\nMột vài đầu bạn có thể tham khảo:` : adaptiveFallback,
    whyExplanation: null,
    followUpChips: defaultFollowUpChips().slice(0, 6),
    sources: [],
    recommendations: recs,
    sessionHints: buildSessionHints(recDocs, recDocs[0]),
    graphReasoningInfo: { pathsUsed: [{ op: "fallback_popular" }] },
    fallback: true,
  };
  return {
    ok: true,
    statusCode: 200,
    data: { ...payload, message: composeMessage(payload) },
  };
};

const { generateAssistantResponse } = require("./geminiService");

const chat = async ({ message, context = {}, actor = null, tenantId = "public", config = {} }) => {
  // Step 1: Initial quick heuristic/graph search to provide baseline context
  const initialResult = await chatInternal({ message, context, actor, tenantId, config });
  
  if (!initialResult.ok || initialResult.data?.handoff?.mode === "human") {
    return initialResult;
  }

  try {
    if (!config.geminiApiKey) {
      return initialResult;
    }
    const recentMessages = context.recentMessages || [];
    const scopedTenantId = normalizeTenantId(tenantId, config.defaultTenantId || "public");
    
    // Step 2: Call Gemini with 'toolsAvailable' enabled
    let aiResponse = await generateAssistantResponse({
      contextDocs: await _getDocsFromIds(initialResult.data, scopedTenantId),
      recentMessages,
      currentMessage: message,
      intent: initialResult.data.graphReasoningInfo?.pathsUsed?.[0]?.intent || "general",
      toolsAvailable: true,
    });

    // Step 3: Tool Execution Loop (Handle one round of tool calls)
    if (aiResponse && aiResponse.type === "tool_call") {
      const toolResults = [];
      const toolMetadata = [];
      let newRecommendations = [];

      for (const call of aiResponse.calls) {
        let resultData = null;
        if (call.name === "search_books") {
          const { docs } = await retrieve(call.args.query, {
            tenantId: scopedTenantId,
            analysis: { concepts: call.args.topic ? [call.args.topic] : [] }
          });
          resultData = docs.slice(0, 5).map(toSource);
          // Sync recommendations with actual DB results
          newRecommendations = docs.slice(0, 6).map(d => mapRecommendation(d, "Tìm thấy", { badges: ["Khớp yêu cầu"] }));
          toolMetadata.push({ op: "agent_search", query: call.args.query, count: docs.length });
        } else if (call.name === "get_book_reviews") {
          const reviews = await catalogClient.getReviews(call.args.productId, scopedTenantId);
          resultData = reviews.slice(0, 5).map(r => ({ 
            user: r.userName || "Khách", 
            rating: r.rating, 
            comment: r.comment 
          }));
          toolMetadata.push({ op: "agent_reviews", productId: call.args.productId });
        } else if (call.name === "get_store_policy") {
          const faqDoc = await CorpusDocument.findOne({ 
            tenantId: scopedTenantId, 
            sourceType: "faq", 
            $or: [
              { refId: call.args.topic }, 
              { keywords: call.args.topic },
              { title: new RegExp(call.args.topic, "i") }
            ] 
          }).lean();
          resultData = faqDoc ? faqDoc.body : "Không tìm thấy chính sách tương ứng.";
          toolMetadata.push({ op: "agent_policy", topic: call.args.topic });
        } else if (call.name === "compare_books") {
          const docs = await CorpusDocument.find({
            tenantId: scopedTenantId,
            refId: { $in: call.args.productIds }
          }).lean();
          resultData = docs.map(d => ({
            title: d.metadata?.title || d.title,
            price: d.metadata?.price,
            author: d.metadata?.author,
            summary: d.body.slice(0, 200)
          }));
          toolMetadata.push({ op: "agent_compare", count: docs.length });
        }

        if (resultData) {
          toolResults.push({ callId: call.id, name: call.name, output: resultData });
        }
      }

      // If agent performed a search, prioritize those results for the UI display
      if (newRecommendations.length > 0) {
        initialResult.data.recommendations = newRecommendations;
      }

      // Final pass: Get text response with tool results context
      aiResponse = await generateAssistantResponse({
        contextDocs: [
          ...(await _getDocsFromIds(initialResult.data, scopedTenantId)), 
          ...toolResults.map(tr => ({ 
            title: `Kết quả từ công cụ ${tr.name}`, 
            body: JSON.stringify(tr.output), 
            sourceType: "support" 
          }))
        ],
        recentMessages,
        currentMessage: message,
        toolsAvailable: false 
      });
      
      if (initialResult.data.graphReasoningInfo) {
        initialResult.data.graphReasoningInfo.agentSteps = toolMetadata;
      }
    }

    if (aiResponse && aiResponse.type === "text") {
      initialResult.data.mainAnswer = aiResponse.text;
      initialResult.data.message = composeMessage(initialResult.data);
      initialResult.data.whyExplanation = null;
    }

  } catch (err) {
    console.error("[chatService agent loop] Failed, falling back to heuristic:", err);
  }
  
  return initialResult;
};

async function _getDocsFromIds(data, tenantId) {
  const ids = [];
  if (data.sources) data.sources.forEach(s => ids.push(s.id));
  if (data.recommendations) data.recommendations.forEach(r => ids.push(r.productId));
  if (data.sessionHints?.focusProductId) ids.push(data.sessionHints.focusProductId);
  
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return [];
  
  return await CorpusDocument.find({
    tenantId,
    refId: { $in: uniqueIds }
  }).lean();
}

module.exports = {
  chat,
};

