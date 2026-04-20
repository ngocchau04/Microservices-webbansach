const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getEnvConfig } = require("../config/env");

let genAI = null;

const initGemini = () => {
  if (genAI) return genAI;
  const config = getEnvConfig();
  if (!config.geminiApiKey) {
    return null;
  }
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
  return genAI;
};

/**
 * Tool definitions for Gemini
 */
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "search_books",
        description: "Tìm kiếm sách trong kho dựa trên từ khóa, chủ đề, tên sách hoặc tác giả.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Từ khóa tìm kiếm đã bóc tách (ví dụ: 'React Native', 'Nguyễn Nhật Ánh').",
            },
            topic: {
              type: "STRING",
              description: "Chủ đề cụ thể (ví dụ: 'lập trình', 'tâm lý').",
            },
            maxPrice: {
              type: "NUMBER",
              description: "Giá tối đa khách muốn mua.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_book_reviews",
        description: "Lấy các đánh giá và nhận xét của khách hàng về một cuốn sách cụ thể để đánh giá chất lượng.",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: {
              type: "STRING",
              description: "ID của cuốn sách cần lấy review.",
            },
            title: {
              type: "STRING",
              description: "Tên sách (để đối chiếu).",
            },
          },
          required: ["productId"],
        },
      },
      {
        name: "compare_books",
        description: "So sánh 2 hoặc nhiều cuốn sách về giá, nội dung, đánh giá.",
        parameters: {
          type: "OBJECT",
          properties: {
            productIds: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Danh sách IDs các cuốn sách cần so sánh.",
            },
          },
          required: ["productIds"],
        },
      },
      {
        name: "get_store_policy",
        description: "Tra cứu các chính sách của cửa hàng như vận chuyển, đổi trả, bảo mật.",
        parameters: {
          type: "OBJECT",
          properties: {
            topic: {
              type: "STRING",
              description: "Chủ đề chính sách (ví dụ: 'shipping', 'returns').",
            },
          },
          required: ["topic"],
        },
      },
    ],
  },
];

const generateAssistantResponse = async ({
  contextDocs = [],
  recentMessages = [],
  currentMessage = "",
  intent = "",
  toolsAvailable = false, // Toggle tool use
}) => {
  const llm = initGemini();
  if (!llm) return null;

  try {
    const config = { model: "gemini-1.5-flash" };
    if (toolsAvailable) {
      config.tools = TOOLS;
    }
    
    const model = llm.getGenerativeModel(config, { apiVersion: "v1" });

    const contextText = contextDocs
      .slice(0, 10)
      .map((doc, i) => {
        if (doc.sourceType === "faq") {
          return `[${i + 1}] FAQ: ${doc.title} - ${(doc.body || "").trim()}`;
        }
        const meta = doc.metadata || {};
        const title = meta.title || doc.title || "Không rõ";
        const author = meta.author || "Nhiều tác giả";
        const price = meta.price ? `${meta.price.toLocaleString("vi-VN")}đ` : "Đang cập nhật";
        return `[${i + 1}] ID: ${doc.refId} | Sách: "${title}" | Tác giả: ${author} | Giá: ${price} | Tóm tắt: ${(doc.body || "").slice(0, 300)}`;
      })
      .join("\n");

    const historyText = recentMessages
      .slice(-6)
      .map((m) => `${m.role === "assistant" ? "Bookie" : "Khách"}: ${m.text}`)
      .join("\n");

    const prompt = `Bạn là Bookie, chuyên gia tư vấn bán hàng chuyên nghiệp của cửa hàng sách.
MỤC TIÊU: Lắng nghe nhu cầu khách hàng, bóc tách ý định thông minh và gợi ý những cuốn sách phù hợp nhất.

PHONG CÁCH:
- Thân thiện, chuyên nghiệp, ngôn ngữ tự nhiên.
- Luôn giải thích TẠI SAO bạn gợi ý cuốn sách đó dựa trên nhu cầu của khách.

QUY TẮC CỐT LÕI (BẮT BUỘC):
1. KHÔNG TỰ CHẾ SÁCH: Chỉ được gợi ý các cuốn sách có ID và tiêu đề xuất hiện trong dữ liệu Ngữ cảnh hoặc kết quả từ công cụ `search_books`. Tuyệt đối không được bịa ra tên sách hoặc tác giả không có trong CSDL.
2. NẾU KHÔNG CÓ SÁCH: Nếu tìm kiếm không trả về kết quả phù hợp, hãy nói rõ là "Hiện tại kho sách của Bookie chưa có đầu sách chính xác như bạn tìm" và gợi ý các chủ đề liên quan nhất đang có sẵn.
3. MINH BẠCH: Giải thích rõ ràng bạn tìm thấy sách này dựa trên tiêu chí nào của khách.

--- DỮ LIỆU NGỮ CẢNH ---
${contextText || "(Đang tìm kiếm thêm dữ liệu...)"}

--- LỊCH SỬ TRÒ CHUYỆN ---
${historyText || "(Hội thoại mới)"}

--- YÊU CẦU HIỆN TẠI (Intent: ${intent}) ---
${currentMessage}

Hãy trả lời khách hàng một cách thông minh và thuyết phục:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Check for tool calls (if any)
    const functionCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
    if (functionCalls && functionCalls.length > 0) {
      return { type: "tool_call", calls: functionCalls.map(p => p.functionCall) };
    }

    return { type: "text", text: response.text() };
  } catch (error) {
    console.error("[GeminiService] Error calling Gemini API:", error.message);
    return null;
  }
};

const generateEmbedding = async (text = "") => {
  const llm = initGemini();
  if (!llm || !text.trim()) return null;
  try {
    const model = llm.getGenerativeModel({ model: "embedding-001" }, { apiVersion: "v1" });
    const result = await model.embedContent(text.trim());
    return result.embedding.values;
  } catch (error) {
    console.error("[GeminiService] Embedding error (single):", error.message);
    return null;
  }
};

const generateBatchEmbeddings = async (texts = []) => {
  const llm = initGemini();
  if (!llm || !texts.length) return [];
  try {
    const model = llm.getGenerativeModel({ model: "embedding-001" }, { apiVersion: "v1" });
    const result = await model.batchEmbedContents({
      requests: texts.map((t) => ({
        content: { role: "user", parts: [{ text: t.trim() }] },
        model: "models/embedding-001",
      })),
    });
    if (result && result.embeddings) {
      return result.embeddings.map((e) => e.values);
    }
    return [];
  } catch (error) {
    console.error("[GeminiService] Batch embedding error (sequential fallback):", error.message);
    const results = [];
    for (const text of texts) {
      const emb = await generateEmbedding(text);
      if (emb) results.push(emb);
    }
    return results;
  }
};

module.exports = {
  generateAssistantResponse,
  generateEmbedding,
  generateBatchEmbeddings,
};

