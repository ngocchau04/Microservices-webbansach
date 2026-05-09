
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

const chatByImage = async ({ message = "", imageBuffer, tenantId = "public", actor = null }) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Image file is required",
      code: "ASSISTANT_IMAGE_REQUIRED",
    };
  }

  // Direct Gemini Vision processing
  const { generateImageAnalysisResponse } = require("./geminiService");
  const aiAnalysis = await generateImageAnalysisResponse({
    imageBuffer,
    message,
    contextDocs: [],
    tenantId: scopedTenantId,
    user: actor
  });

  const fallbackMsg = "Xin lỗi, hiện tại mình không thể phân tích ảnh. Bạn có thể thử lại bằng cách gõ tên sách nhé.";

  return {
    ok: true,
    statusCode: 200,
    data: {
      message: aiAnalysis || fallbackMsg,
      mainAnswer: aiAnalysis || fallbackMsg,
      recommendations: [],
      fallback: !aiAnalysis,
      graphReasoningInfo: {
        expandedBy: "gemini_vision_direct"
      },
    },
  };
};

module.exports = {
  chatByImage,
};

