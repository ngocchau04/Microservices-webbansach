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
  isFallback = false,
  user = null,
}) => {
  const llm = initGemini();
  if (!llm) return null;

  try {
    // Switch to gemini-2.0-flash as gemini-1.5-flash is not available here
    const config = { model: "gemini-flash-latest" };
    if (toolsAvailable) {
      config.tools = TOOLS;
    }
    
    const model = llm.getGenerativeModel(config);

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

    const prompt = `Bạn là Bookie, Chuyên gia tư vấn và Trợ lý mua sắm thông minh của hệ thống hiệu sách Microservices-Webbansach.

MỤC TIÊU:
1. Tư vấn và thuyết phục khách hàng tìm được cuốn sách ưng ý nhất dựa trên nhu cầu, sở thích và mục tiêu học tập của họ.
2. Cung cấp thông tin chính xác về chính sách cửa hàng (vận chuyển, đổi trả).
3. Luôn giữ thái độ thân thiện, nhiệt tình và am hiểu sâu sắc về lĩnh vực sách.

QUY TẮC CỐT LÕI (BẮT BUỘC):
- CHỈ GỢI Ý SÁCH CÓ TRẬT TỰ: Chỉ được gợi ý các cuốn sách có ID (refId) và tiêu đề xuất hiện trong dữ liệu Ngữ cảnh hoặc kết quả từ công cụ. Tuyệt đối không được bịa ra tên sách hoặc tác giả không có trong CSDL.
- NẾU KHÔNG CÓ KẾT QUẢ: Đừng bao giờ nói "Tôi không biết". Thay vào đó, hãy dùng công cụ \`search_books\` để tìm kiếm rộng hơn hoặc gợi ý những chủ đề liên quan nhất đang có sẵn.
- TƯ VẤN CÓ CHIỀU SÂU: Thay vì chỉ liệt kê danh sách, hãy giải thích TẠI SAO cuốn sách này lại phù hợp với yêu cầu của khách (ví dụ: "Vì bạn đang tìm hiểu về React cho người mới, cuốn X có lộ trình từ cơ bản...").
- KHUYẾN KHÍCH HÀNH ĐỘNG: Gợi ý khách hàng xem chi tiết sản phẩm hoặc thêm vào giỏ hàng nếu họ có vẻ ưng ý.

--- THÔNG TIN NGƯỜI DÙNG (Để chào hỏi và tư vấn cá nhân hóa) ---
${user ? `Khách hàng: ${user.fullName || user.name || "Khách"} ${user.address ? `| Địa chỉ: ${user.address}` : ""}` : "(Khách chưa đăng nhập)"}

--- DỮ LIỆU NGỮ CẢNH (RAG Context) ---
${contextText || "(Không có dữ liệu trực tiếp, hãy dùng công cụ tìm kiếm nếu cần)"}

--- LỊCH SỬ TRÒ CHUYỆN ---
${historyText || "(Hội thoại mới bắt đầu)"}

--- YÊU CẦU HIỆN TẠI (Ý định: ${intent}) ---
${isFallback ? "> LƯU Ý: Kết quả tìm kiếm hiện tại rất hạn chế hoặc không khớp. Vui lòng sử dụng công cụ `search_books` để tìm kiếm sâu hơn hoặc tư vấn dựa trên kiến thức chung nếu khách hàng chỉ đang trò chuyện xã giao." : ""}
Câu hỏi của khách: "${currentMessage}"

Hãy trả lời khách hàng một cách thông minh, tự nhiên và chuyên nghiệp nhất (Sử dụng Tiếng Việt):`;

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
    const model = llm.getGenerativeModel({ model: "gemini-embedding-2" });
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
    const model = llm.getGenerativeModel({ model: "gemini-embedding-2" });
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

const generateImageAnalysisResponse = async ({
  imageBuffer = null,
  message = "",
  contextDocs = [],
  tenantId = "public",
  user = null,
  toolsAvailable = false,
}) => {
  const llm = initGemini();
  if (!llm || !imageBuffer) return null;

  try {
    const config = { model: "gemini-flash-latest" };
    if (toolsAvailable) {
      config.tools = TOOLS;
    }
    
    const model = llm.getGenerativeModel(config);

    const contextText = contextDocs
      .slice(0, 10)
      .map((doc, i) => {
        const meta = doc.metadata || {};
        const title = meta.title || doc.title || "Không rõ";
        const author = meta.author || "Nhiều tác giả";
        const price = meta.price ? `${meta.price.toLocaleString("vi-VN")}đ` : "Đang cập nhật";
        return `[${i + 1}] ID: ${doc.refId} | Sách: "${title}" | Tác giả: ${author} | Giá: ${price} | Tóm tắt: ${(doc.body || "").slice(0, 200)}`;
      })
      .join("\n");

    const prompt = `Bạn là Bookie, Chuyên gia tư vấn và Trợ lý mua sắm thông minh của hệ thống hiệu sách Microservices-Webbansach.
Khách hàng vừa gửi một tấm ảnh. Hãy phân tích nội dung tấm ảnh (ví dụ: bìa sách, một đoạn văn bản, hoặc một chủ đề liên quan đến sách) và tư vấn cho họ.

NHIỆM VỤ:
1. Mô tả ngắn gọn bạn thấy gì trong ảnh.
2. Dựa trên dữ liệu Ngữ cảnh (RAG) bên dưới, hãy xác định xem có cuốn sách nào phù hợp không.
3. QUY TẮC QUAN TRỌNG: Nếu không thấy sách phù hợp trực tiếp trong Ngữ cảnh, hãy SỬ DỤNG CÔNG CỤ \`search_books\` để tìm kiếm trong kho dữ liệu. Bạn PHẢI gọi hàm (function call), KHÔNG ĐƯỢC tự viết JSON ra tin nhắn.
4. Trả lời bằng Tiếng Việt, thân thiện và chuyên nghiệp.

--- THÔNG TIN NGƯỜI DÙNG ---
${user ? `Khách hàng: ${user.fullName || user.name || "Khách"} ${user.address ? `| Địa chỉ: ${user.address}` : ""}` : "(Khách chưa đăng nhập)"}

--- DỮ LIỆU NGỮ CẢNH (RAG Context) ---
${contextText || "(Không có dữ liệu ngữ cảnh trực tiếp, hãy sử dụng công cụ tìm kiếm nếu cần)"}

--- CÂU HỎI KÈM THEO CỦA KHÁCH ---
${message || "Khách không để lại lời nhắn kèm ảnh."}

Hãy phân tích ảnh và tư vấn khách hàng:`;

    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: "image/jpeg",
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    
    if (!response.candidates || response.candidates.length === 0) {
      console.warn("[GeminiService] No candidates returned.");
      return { type: "text", text: "Xin lỗi, mình không thể phân tích hình ảnh này vì lý do an toàn hoặc kỹ thuật." };
    }

    // 1. Primary: Official Function Call parts
    const functionCalls = response.candidates[0].content?.parts?.filter(p => p.functionCall);
    if (functionCalls && functionCalls.length > 0) {
      console.log(`[GeminiService] Model requested ${functionCalls.length} tool calls via API.`);
      return { type: "tool_call", calls: functionCalls.map(p => p.functionCall) };
    }

    // 2. Secondary/Fallback: Text-based JSON parsing
    const text = response.text();
    if (toolsAvailable && text.includes("search_books")) {
      try {
        const jsonMatch = text.match(/\{[\s\S]*search_books[\s\S]*\}/);
        if (jsonMatch) {
          const rawJson = jsonMatch[0];
          const parsed = JSON.parse(rawJson);
          console.log("[GeminiService] Found textual tool call fallback.");
          
          let query = "sach";
          // Case 1: { "action": "search_books", "action_input": "..." }
          if (parsed.action === "search_books") {
            query = parsed.action_input || parsed.query || "sach";
          } 
          // Case 2: { "search_books": { "keyword": "..." } }
          else if (parsed.search_books && typeof parsed.search_books === "object") {
            query = parsed.search_books.keyword || parsed.search_books.query || parsed.search_books.topic || "sach";
          }
          // Case 3: { "search_books": "..." }
          else if (parsed.search_books) {
            query = parsed.search_books;
          }

          return { 
            type: "tool_call", 
            calls: [{ 
              name: "search_books", 
              args: { query: String(query) } 
            }] 
          };
        }
      } catch (e) {
        console.warn("[GeminiService] Failed to parse textual tool call fallback:", e.message);
      }
    }

    return { type: "text", text };
  } catch (error) {
    console.error("[GeminiService] Image analysis error:", error);
    return null;
  }
};

module.exports = {
  generateAssistantResponse,
  generateImageAnalysisResponse,
  generateEmbedding,
  generateBatchEmbeddings,
};

