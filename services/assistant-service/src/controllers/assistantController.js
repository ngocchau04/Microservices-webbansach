const chatService = require("../services/chatService");
const { runReindex, loadDefaultFaq } = require("../services/reindexService");
const { sendServiceResult } = require("../utils/http");

const chat = async (req, res) => {
  const result = await chatService.chat({
    message: req.body?.message,
    context: req.body?.context && typeof req.body.context === "object" ? req.body.context : {},
    config: req.app.locals.config || {},
  });
  return sendServiceResult(res, result);
};

const reindex = async (req, res) => {
  const result = await runReindex(req.app.locals.config);
  return sendServiceResult(res, result);
};

const suggestions = async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const faq = loadDefaultFaq();
  const base = [
    "Gợi ý sách bán chạy",
    "Tìm sách React",
    "Sách về MongoDB",
    "Có sách nào cùng tác giả không?",
    "Gợi ý sách cùng thể loại",
    "Vì sao bạn gợi ý cuốn này?",
    "Chính sách vận chuyển",
    "Đổi trả và hoàn tiền",
  ];
  const fromFaq = faq.map((item) => item.title).slice(0, 6);
  const merged = [...new Set([...base, ...fromFaq])].slice(0, 12);

  return res.status(200).json({
    success: true,
    data: {
      query: q,
      suggestions: merged,
    },
  });
};

module.exports = {
  chat,
  reindex,
  suggestions,
};
