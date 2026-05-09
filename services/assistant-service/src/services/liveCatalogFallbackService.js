const catalogClient = require("../utils/catalogClient");

const KNOWN_QUERY_WORDS = new Set([
  "react",
  "mongodb",
  "javascript",
  "java",
  "node",
  "python",
  "sql",
  "backend",
  "frontend",
  "api",
  "it",
]);

const normalize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatPrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${n.toLocaleString("vi-VN")} d`;
};

const buildProductReason = ({ mode, keyword, anchor }) => {
  if (mode === "search") return `Phù hợp với tìm kiếm "${keyword}".`;
  if (mode === "popular") return "Được nhiều độc giả yêu thích.";
  if (mode === "same_author") return `Cùng tác giả với cuốn "${anchor?.title || "bạn đang xem"}".`;
  if (mode === "same_category") return `Cùng thể loại với cuốn "${anchor?.title || "bạn đang xem"}".`;
  if (mode === "cheaper") return `Mức giá tốt hơn ${formatPrice(anchor?.price)}.`;
  return "Gợi ý phù hợp cho bạn.";
};

const toRecommendation = (item, reason) => ({
  productId: String(item._id || item.id || ""),
  title: item.title || "Sach",
  author: item.author || "",
  price: Number(item.price) || 0,
  imgSrc: item.imgSrc || "",
  reasonTag: "De xuat",
  reasonLine: reason,
  detailPath: item._id ? `/book/${item._id}` : "",
  stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : null,
});

const extractKeyword = ({ message = "", analysis = {} }) => {
  const normalized = normalize(message);
  const words = normalized.split(" ").filter(Boolean);
  const fromKnown = words.find((w) => KNOWN_QUERY_WORDS.has(w));
  if (fromKnown) return fromKnown;

  const tokens = Array.isArray(analysis.baseTokens) ? analysis.baseTokens : [];
  const candidates = tokens.filter((t) => t.length >= 3 && !["co", "sach", "tim", "nao", "cuon", "ve"].includes(t));
  return candidates[0] || "";
};

const buildReply = ({
  mainAnswer,
  recommendations = [],
  followUpChips = [],
  whyExplanation = null,
  fallback = false,
  graphReasoningInfo = null,
  sessionHints = {},
}) => ({
  ok: true,
  statusCode: 200,
  data: {
    message: mainAnswer,
    mainAnswer,
    whyExplanation,
    recommendations,
    followUpChips,
    sources: [],
    fallback,
    graphReasoningInfo,
    sessionHints,
  },
});

const POLICY_SHIPPING =
  "Đơn hàng của bạn sẽ được xử lý sớm nhất trong giờ làm việc. Bạn có thể theo dõi trạng thái vận chuyển trong mục 'Đơn hàng của tôi' nhé.";
const POLICY_RETURNS =
  "Bạn có thể yêu cầu đổi trả trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm có lỗi hoặc không đúng mô tả. Đội ngũ Bookie sẽ hỗ trợ bạn nhiệt tình!";

const buildSessionHints = (items = [], anchor = null) => {
  const top = anchor || items[0];
  if (!top) return {};
  return {
    focusProductId: String(top._id || top.id || ""),
    lastProductId: String(top._id || top.id || ""),
  };
};

const runLiveCatalogFallback = async ({ message, intent, analysis, context = {}, tenantId = "public" }) => {
  const currentProductId = String(context.currentProductId || context.lastProductId || "").trim();
  const stockCheckIntent = /con hang|het hang|ton kho|con khong/i.test(message || "");

  if (stockCheckIntent && currentProductId) {
    const current = await catalogClient.getProductDetails(currentProductId, tenantId);
    if (!current) {
      return buildReply({
        mainAnswer: "Minh chua lay duoc ton kho cua cuon dang xem. Vui long thu lai sau.",
        fallback: true,
      });
    }
    const stock = Number(current.stock);
    const line =
      Number.isFinite(stock) && stock > 0
        ? `Cuon \"${current.title}\" dang con hang (${stock} quyen).`
        : `Cuon \"${current.title}\" hien tam het hang.`;
    return buildReply({
      mainAnswer: line,
      followUpChips: [{ id: "same_category", label: "Cung the loai" }],
      sessionHints: buildSessionHints([], current),
      graphReasoningInfo: { pathsUsed: [{ op: "live_catalog_stock_check" }] },
    });
  }

  if (intent === "shipping_policy") {
    return buildReply({
      mainAnswer: POLICY_SHIPPING,
      followUpChips: [{ id: "return_policy", label: "Doi tra va hoan tien" }],
      graphReasoningInfo: { policyBadge: "policy_shipping", pathsUsed: [{ op: "policy_static_shipping" }] },
    });
  }

  if (intent === "return_policy") {
    return buildReply({
      mainAnswer: POLICY_RETURNS,
      followUpChips: [{ id: "shipping_policy", label: "Chinh sach van chuyen" }],
      graphReasoningInfo: { policyBadge: "policy_returns", pathsUsed: [{ op: "policy_static_returns" }] },
    });
  }

  if (intent === "same_author" || intent === "same_category" || intent === "cheaper") {
    if (!currentProductId) {
      return buildReply({
        mainAnswer:
          "Ban dang chua o trang chi tiet sach. Hay mo mot cuon sach roi hoi lai 'cung tac gia', 'cung the loai' hoac 'sach re hon'.",
        fallback: true,
      });
    }

    const anchor = await catalogClient.getProductDetails(currentProductId, tenantId);
    if (!anchor) {
      return buildReply({
        mainAnswer: "Khong lay duoc thong tin cuon sach hien tai. Vui long thu tai lai trang chi tiet sach.",
        fallback: true,
      });
    }

    let items = [];
    if (intent === "same_author") {
      items = await catalogClient.searchProducts({ author: anchor.author, limit: 8 }, tenantId);
      items = items.filter((x) => String(x._id) !== String(anchor._id)).slice(0, 5);
    }

    if (intent === "same_category") {
      items = await catalogClient.searchProducts({ type: anchor.type, limit: 12 }, tenantId);
      items = items.filter((x) => String(x._id) !== String(anchor._id)).slice(0, 5);
    }

    if (intent === "cheaper") {
      items = await catalogClient.searchProducts({ type: anchor.type, maxPrice: anchor.price, limit: 20, sortBy: "price", sortOrder: "asc" }, tenantId);
      items = items
        .filter((x) => String(x._id) !== String(anchor._id))
        .filter((x) => Number(x.price) < Number(anchor.price))
        .slice(0, 5);
    }

    if (!items.length) {
      return buildReply({
        mainAnswer: "Hien chua tim thay ket qua phu hop trong kho sach hien tai.",
        fallback: true,
        sessionHints: buildSessionHints([], anchor),
      });
    }

    const recommendations = items.map((item) =>
      toRecommendation(item, buildProductReason({ mode: intent, anchor }))
    );

    return buildReply({
      mainAnswer:
        intent === "same_author"
          ? `Minh tim thay ${recommendations.length} cuon cung tac gia voi "${anchor.title}".`
          : intent === "same_category"
          ? `Minh tim thay ${recommendations.length} cuon cung the loai voi "${anchor.title}".`
          : `Minh tim thay ${recommendations.length} cuon re hon "${anchor.title}".`,
      recommendations,
      followUpChips: [
        { id: "same_author", label: "Cung tac gia" },
        { id: "same_category", label: "Cung the loai" },
        { id: "cheaper", label: "Sach re hon" },
      ],
      sessionHints: buildSessionHints(items, anchor),
      graphReasoningInfo: { pathsUsed: [{ op: "live_catalog", intent }] },
    });
  }

  if (intent === "catalog_ranking" || intent === "recommend" || intent === "popular") {
    const items = await catalogClient.listTopProducts(tenantId, 5);
    if (!items.length) {
      return buildReply({
        mainAnswer: "Hien minh chua lay duoc danh sach sach noi bat tu catalog-service.",
        fallback: true,
      });
    }
    return buildReply({
      mainAnswer: "Dưới đây là một số tựa sách nổi bật và đang được yêu thích tại Bookie:",
      recommendations: items.map((item) => toRecommendation(item, buildProductReason({ mode: "popular" }))),
      followUpChips: [
        { id: "same_category", label: "Cung the loai" },
        { id: "cheaper", label: "Sach re hon" },
      ],
      sessionHints: buildSessionHints(items),
      graphReasoningInfo: { pathsUsed: [{ op: "live_catalog_top10" }] },
    });
  }

  const shouldSearch =
    intent === "search" ||
    intent === "search_product" ||
    /co sach|tim sach|sach ve|sach .*khong|mongodb|react|javascript|java|node|python/i.test(message || "");

  if (shouldSearch) {
    const keyword = extractKeyword({ message, analysis });
    if (!keyword) {
      return null;
    }
    const items = await catalogClient.searchProducts({ q: keyword, limit: 8 }, tenantId);
    const normalizedKey = normalize(keyword);
    const ranked = items
      .map((item) => {
        const hay = normalize(`${item.title} ${item.author} ${item.description || ""}`);
        let score = 0;
        if (hay.includes(normalizedKey)) score += 5;
        if (normalize(item.title).includes(normalizedKey)) score += 4;
        if (Number.isFinite(Number(item.rating))) score += Number(item.rating) / 2;
        if (Number.isFinite(Number(item.soldCount))) score += Math.log10(Number(item.soldCount) + 1);
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.item);

    if (!ranked.length) {
      return null;
    }

    return buildReply({
      mainAnswer: `Mình tìm thấy ${ranked.length} cuốn sách rất phù hợp với từ khóa "${keyword}" của bạn:`,
      recommendations: ranked.map((item) => toRecommendation(item, buildProductReason({ mode: "search", keyword }))),
      followUpChips: [
        { id: "popular", label: "Goi y sach ban chay" },
        { id: "shipping_policy", label: "Chinh sach van chuyen" },
      ],
      sessionHints: buildSessionHints(ranked),
      graphReasoningInfo: { pathsUsed: [{ op: "live_catalog_search", keyword }] },
    });
  }

  if (intent === "explain") {
    if (currentProductId) {
      const anchor = await catalogClient.getProductDetails(currentProductId, tenantId);
      if (anchor) {
        return buildReply({
          mainAnswer: `Minh goi y dua tren du lieu that: cung tac gia (${anchor.author}), cung the loai (${anchor.type}), muc gia (${formatPrice(anchor.price)}) va muc do pho bien (soldCount/rating neu co).`,
          followUpChips: [
            { id: "same_author", label: "Cung tac gia" },
            { id: "same_category", label: "Cung the loai" },
            { id: "cheaper", label: "Sach re hon" },
          ],
          sessionHints: buildSessionHints([], anchor),
        });
      }
    }
    return buildReply({
      mainAnswer:
        "Minh goi y dua tren du lieu that trong catalog: do khop tu khoa, cung tac gia/cung the loai, muc gia (re hon), va do pho bien (soldCount/rating neu co).",
      followUpChips: [
        { id: "same_author", label: "Cung tac gia" },
        { id: "same_category", label: "Cung the loai" },
        { id: "cheaper", label: "Sach re hon" },
      ],
    });
  }

  return null;
};

module.exports = {
  runLiveCatalogFallback,
};
