
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
  const { getEnvConfig } = require("../config/env");
  const { generateImageAnalysisResponse } = require("./geminiService");
  const { retrieve } = require("./retrievalService");
  const { CorpusDocument } = require("../models/CorpusDocument");
  
  const config = getEnvConfig();
  const scopedTenantId = normalizeTenantId(tenantId, "public");

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Image file is required",
      code: "ASSISTANT_IMAGE_REQUIRED",
    };
  }

  try {
    console.log(`[imageChatService] Starting analysis for tenant: ${scopedTenantId}`);
    // Step 1: Call Gemini with 'toolsAvailable' enabled
    let aiResponse = await generateImageAnalysisResponse({
      imageBuffer,
      message,
      contextDocs: [], 
      tenantId: scopedTenantId,
      user: actor,
      toolsAvailable: true
    });

    console.log(`[imageChatService] Initial AI Response type: ${aiResponse?.type}`);

    let recommendations = [];
    let agentSteps = [];

    // Step 2: Tool Execution Loop (Handle one round of tool calls)
    if (aiResponse && aiResponse.type === "tool_call") {
      const toolResults = [];
      
      for (const call of aiResponse.calls) {
        console.log(`[imageChatService] Executing tool: ${call.name} with args:`, call.args);
        let resultData = null;
        if (call.name === "search_books") {
          const { docs } = await retrieve(call.args.query, {
            tenantId: scopedTenantId,
            analysis: { concepts: call.args.topic ? [call.args.topic] : [] }
          });
          console.log(`[imageChatService] Tool search found ${docs.length} docs.`);
          resultData = docs.slice(0, 5).map(d => ({
            id: d.refId,
            title: d.metadata?.title || d.title,
            author: d.metadata?.author,
            price: d.metadata?.price,
            summary: d.body.slice(0, 200)
          }));
          
          // Map to UI recommendations
          recommendations = docs.slice(0, 6).map(d => ({
            productId: d.refId,
            title: d.metadata?.title || d.title,
            author: d.metadata?.author,
            price: d.metadata?.price,
            imgSrc: d.metadata?.imgSrc,
            reasonTag: "Tìm thấy từ ảnh",
            reasonLine: `Dựa trên phân tích hình ảnh: "${call.args.query}"`,
            detailPath: `/book/${d.refId}`
          }));
          
          agentSteps.push({ op: "agent_search_from_image", query: call.args.query, count: docs.length });
        }
        
        if (resultData) {
          toolResults.push({ name: call.name, output: resultData });
        }
      }

      // Step 3: Final pass - Get text response with tool results context
      aiResponse = await generateImageAnalysisResponse({
        imageBuffer, // Keep image context if needed, though results are now in text
        message,
        contextDocs: toolResults.flatMap(tr => tr.output.map(item => ({
          refId: item.id,
          title: item.title,
          body: `${item.summary} | Tác giả: ${item.author} | Giá: ${item.price}`,
          metadata: { title: item.title, author: item.author, price: item.price }
        }))),
        tenantId: scopedTenantId,
        user: actor,
        toolsAvailable: false 
      });
    }

    const mainAnswer = aiResponse?.text || "Xin lỗi, mình gặp chút vấn đề khi phân tích hình ảnh này.";

    return {
      ok: true,
      statusCode: 200,
      data: {
        message: mainAnswer,
        mainAnswer,
        recommendations,
        fallback: !aiResponse,
        graphReasoningInfo: {
          expandedBy: "gemini_vision_agent",
          note: "Lightweight Agent Mode: Gemini analyzed image and performed DB retrieval",
          agentSteps
        },
      },
    };
  } catch (error) {
    console.error("[imageChatService] Error:", error);
    return {
      ok: false,
      statusCode: 500,
      message: "Internal server error during image chat",
    };
  }
};

module.exports = {
  chatByImage,
};

