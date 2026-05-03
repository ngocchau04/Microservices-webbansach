const imageSearchClient = require("../utils/imageSearchClient");
const catalogClient = require("../utils/catalogClient");
const { graphTraverseRecommendations } = require("./graphTraversalService");
const { normalizeTenantId } = require("./tenantContextService");

const detectGraphIntentFromMessage = (message = "") => {
  const n = String(message || "").toLowerCase();
  if (/cung tac gia|tac gia/.test(n)) return "same_author";
  if (/cung the loai|the loai|giong/.test(n)) return "same_category";
  if (/re hon|gia thap hon|sach re/.test(n)) return "cheaper";
  return null;
};

const mapProduct = (product, reason, score = null) => ({
  productId: String(product._id || product.id || ""),
  title: product.title || "Sach",
  author: product.author || "",
  price: Number(product.price) || 0,
  imgSrc: product.imgSrc || "",
  reasonTag: "Image",
  reasonLine: reason,
  detailPath: product._id ? `/book/${product._id}` : "",
  score,
});

const chatByImage = async ({ message = "", imageBuffer, tenantId = "public" }) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Image file is required",
      code: "ASSISTANT_IMAGE_REQUIRED",
    };
  }

  const matchesResult = await imageSearchClient.searchByImageBuffer(imageBuffer, 6);
  if (!matchesResult.ok) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        message:
          "Hiện tính năng tìm sách bằng ảnh chưa sẵn sàng. Bạn có thể nhập tên sách hoặc chủ đề để mình tìm giúp.",
        mainAnswer:
          "Hiện tính năng tìm sách bằng ảnh chưa sẵn sàng. Bạn có thể nhập tên sách hoặc chủ đề để mình tìm giúp.",
        recommendations: [],
        fallback: true,
        followUpChips: [{ id: "search_text", label: "Tim sach React" }],
      },
    };
  }

  const matches = Array.isArray(matchesResult.data?.matches) ? matchesResult.data.matches : [];
  if (!matches.length) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        message: "Mình chưa tìm thấy sách phù hợp từ ảnh bạn gửi.",
        mainAnswer: "Mình chưa tìm thấy sách phù hợp từ ảnh bạn gửi.",
        recommendations: [],
        fallback: true,
      },
    };
  }

  const products = [];
  for (const m of matches) {
    const product = await catalogClient.getProductDetails(m.productId, scopedTenantId);
    if (product) {
      products.push({ product, score: m.score });
    }
  }
  if (!products.length) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        message: "Mình nhận diện được ảnh nhưng chưa lấy được thông tin sản phẩm chi tiết.",
        mainAnswer: "Mình nhận diện được ảnh nhưng chưa lấy được thông tin sản phẩm chi tiết.",
        recommendations: [],
        fallback: true,
      },
    };
  }

  const anchor = products[0].product;
  const graphIntent = detectGraphIntentFromMessage(message);

  if (graphIntent) {
    const graphResult = await graphTraverseRecommendations({
      tenantId: scopedTenantId,
      currentProductId: String(anchor._id),
      intent: graphIntent,
      limit: 5,
    });
    if (graphResult.ok && graphResult.data?.recommendations?.length) {
      return {
        ok: true,
        statusCode: 200,
        data: {
          message:
            "Đầu tiên mình nhận diện ảnh gần với một cuốn trong kho, sau đó mở rộng theo đồ thị để lấy gợi ý phù hợp hơn.",
          mainAnswer:
            "Đầu tiên mình nhận diện ảnh gần với một cuốn trong kho, sau đó mở rộng theo đồ thị để lấy gợi ý phù hợp hơn.",
          recommendations: graphResult.data.recommendations,
          fallback: false,
          graphReasoningInfo: {
            expandedBy: graphIntent,
            anchorProductId: String(anchor._id),
          },
        },
      };
    }
  }

  return {
    ok: true,
    statusCode: 200,
    data: {
      message: "Mình tìm thấy một số sách có bìa hoặc nội dung gần giống ảnh bạn gửi:",
      mainAnswer: "Mình tìm thấy một số sách có bìa hoặc nội dung gần giống ảnh bạn gửi:",
      recommendations: products.slice(0, 5).map((x) =>
        mapProduct(x.product, "Ảnh bìa có độ tương đồng cao với ảnh bạn gửi.", x.score)
      ),
      fallback: false,
      graphReasoningInfo: {
        expandedBy: "image_similarity",
        anchorProductId: String(anchor._id),
      },
    },
  };
};

module.exports = {
  chatByImage,
};

