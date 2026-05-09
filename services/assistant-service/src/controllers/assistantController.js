const chatService = require("../services/chatService");
const { runReindex, loadDefaultFaq } = require("../services/reindexService");
const { rebuildGraphIndex } = require("../services/graphIndexService");
const { chatByImage } = require("../services/imageChatService");
const { sendServiceResult } = require("../utils/http");

const chat = async (req, res) => {
  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const currentProductId = String(req.body?.currentProductId || "").trim();
  if (currentProductId && !context.currentProductId) {
    context.currentProductId = currentProductId;
  }
  if (currentProductId && !context.lastProductId) {
    context.lastProductId = currentProductId;
  }

  const result = await chatService.chat({
    message: req.body?.message,
    context,
    tenantId: req.tenantId,
    actor: req.user || null,
    config: req.app.locals.config || {},
  });
  return sendServiceResult(res, result);
};

const reindex = async (req, res) => {
  const result = await runReindex(req.app.locals.config, req.tenantId);
  return sendServiceResult(res, result);
};

const graphReindex = async (req, res) => {
  const result = await rebuildGraphIndex({
    tenantId: req.tenantId,
    config: req.app.locals.config || {},
  });
  return sendServiceResult(res, result);
};

const chatImage = async (req, res) => {
  const result = await chatByImage({
    message: req.body?.message || "",
    imageBuffer: req.file?.buffer || null,
    tenantId: req.tenantId,
    actor: req.user || null,
  });
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
  graphReindex,
  chatImage,
  suggestions,
};
