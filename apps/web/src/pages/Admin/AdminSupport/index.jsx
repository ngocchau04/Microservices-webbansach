import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBoxes,
  FaExclamationTriangle,
  FaReply,
  FaRobot,
  FaTags,
  FaUser,
  FaUserShield,
  FaMagic,
} from "react-icons/fa";
import { getProducts } from "../../../api/catalogApi";
import {
  getAdminFeedback,
  postAdminSupportConversationMessage,
  updateAdminFeedbackStatus,
} from "../../../api/supportApi";
import { sendAssistantChat } from "../../../services/assistantApi";
import {
  buildAdminCopilotContextPayload,
  createDefaultSections,
  DEFAULT_ADMIN_COPILOT_MESSAGE,
  parseAdminCopilotSections,
} from "./copilotUtils";
import "./AdminSupport.css";

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];
const STATUS_LABELS = {
  open: "Mở",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
  closed: "Đã đóng",
};
const MAX_COPILOT_REPLIES = 3;
const ROLE_META = {
  user: {
    label: "Khách hàng",
    className: "role-chip role-chip--user",
    icon: <FaUser aria-hidden />,
  },
  admin: {
    label: "Nhân viên hỗ trợ",
    className: "role-chip role-chip--admin",
    icon: <FaUserShield aria-hidden />,
  },
  system: {
    label: "Hệ thống / Trợ lý",
    className: "role-chip role-chip--system",
    icon: <FaMagic aria-hidden />,
  },
};

const getStockStatus = (stock) => {
  if (stock === 0) return "out";
  if (stock > 0 && stock < 5) return "low";
  return "normal";
};

const detectSupportTags = (text = "") => {
  const source = String(text || "").toLowerCase();
  const checks = [
    {
      key: "giao_hang",
      label: "Giao hàng",
      keywords: ["giao hàng", "ship", "vận chuyển", "đơn hàng", "chưa nhận"],
    },
    {
      key: "thanh_toan",
      label: "Thanh toán",
      keywords: ["thanh toán", "chuyển khoản", "thẻ", "momo", "trừ tiền", "hoàn tiền"],
    },
    {
      key: "doi_tra",
      label: "Đổi trả",
      keywords: ["đổi trả", "trả hàng", "hoàn", "lỗi", "hỏng"],
    },
    {
      key: "tai_khoan",
      label: "Tài khoản",
      keywords: ["đăng nhập", "mật khẩu", "tài khoản", "otp"],
    },
    {
      key: "san_pham",
      label: "Sản phẩm",
      keywords: ["sách", "hết hàng", "còn hàng", "tồn kho", "giá"],
    },
  ];

  const matches = checks.filter((item) =>
    item.keywords.some((keyword) => source.includes(keyword))
  );
  if (!matches.length) {
    return ["Cần làm rõ thêm"];
  }
  return matches.slice(0, 3).map((item) => item.label);
};

const buildEscalationSuggestion = ({ text = "", status = "open", tags = [] }) => {
  const source = String(text || "").toLowerCase();
  const hasCriticalSignal = [
    "đã trừ tiền",
    "không nhận được hàng",
    "khiếu nại",
    "lừa đảo",
    "hoàn tiền gấp",
  ].some((keyword) => source.includes(keyword));
  const hasMediumSignal = ["đổi trả", "hỏng", "vỡ", "giao trễ", "thất lạc"].some((keyword) =>
    source.includes(keyword)
  );

  if (status === "closed") {
    return {
      level: "low",
      title: "Không cần escalate",
      detail: "Hội thoại đã đóng. Chỉ mở lại nếu khách gửi thêm thông tin mới.",
    };
  }

  if (hasCriticalSignal) {
    return {
      level: "high",
      title: "Đề xuất escalate cấp quản lý",
      detail: "Có tín hiệu rủi ro cao (thanh toán/khiếu nại). Nên chuyển cấp giám sát hỗ trợ.",
    };
  }

  if (hasMediumSignal || tags.includes("Đổi trả") || tags.includes("Thanh toán")) {
    return {
      level: "medium",
      title: "Đề xuất escalate cấp chuyên trách",
      detail: "Nên phối hợp nhóm vận hành đơn hàng hoặc tài chính để xử lý nhanh.",
    };
  }

  return {
    level: "low",
    title: "Tiếp tục xử lý tại tuyến hiện tại",
    detail: "Có thể trả lời bằng kịch bản chuẩn, chưa cần escalate.",
  };
};

const buildQuickReplySuggestions = ({ text = "", tags = [] }) => {
  const source = String(text || "").toLowerCase();
  const templates = [];

  if (source.includes("chưa nhận") || tags.includes("Giao hàng")) {
    templates.push(
      "Bookie đã ghi nhận tình trạng giao hàng. Mình đang kiểm tra vận đơn và sẽ cập nhật cho bạn trong ít phút.",
      "Mình rất tiếc vì đơn chưa đến đúng hẹn. Team hỗ trợ đang ưu tiên xử lý và sẽ phản hồi mốc giao mới sớm."
    );
  }

  if (source.includes("trừ tiền") || tags.includes("Thanh toán")) {
    templates.push(
      "Mình đã ghi nhận phản ánh thanh toán. Team sẽ đối soát giao dịch và gửi kết quả cho bạn sớm nhất.",
      "Cảm ơn bạn đã cung cấp thông tin. Bên mình sẽ kiểm tra trạng thái thanh toán và hướng xử lý hoàn tiền nếu cần."
    );
  }

  if (source.includes("đổi trả") || tags.includes("Đổi trả")) {
    templates.push(
      "Mình đã tiếp nhận yêu cầu đổi trả. Bạn vui lòng giữ nguyên tình trạng sản phẩm, team sẽ hướng dẫn bước tiếp theo ngay.",
      "Bookie xin lỗi vì trải nghiệm chưa tốt. Mình sẽ tạo yêu cầu đổi trả và phản hồi timeline cụ thể cho bạn."
    );
  }

  templates.push(
    "Mình đã tiếp nhận yêu cầu và đang phối hợp bộ phận liên quan. Cảm ơn bạn đã chờ trong giây lát.",
    "Để hỗ trợ chính xác hơn, bạn vui lòng xác nhận giúp mình mã đơn hoặc email đặt hàng."
  );

  return [...new Set(templates)].slice(0, MAX_COPILOT_REPLIES);
};

const prettyState = (state = "") => {
  if (state === "waiting_human") return "Đang chờ hỗ trợ";
  if (state === "human_active") return "Đang xử lý";
  if (state === "closed") return "Đã đóng";
  return "Bot xử lý";
};

function AdminSupport() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState("");
  const [copilotSections, setCopilotSections] = useState(createDefaultSections);
  const [appliedCategory, setAppliedCategory] = useState("");
  const [escalationFlag, setEscalationFlag] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventorySummary, setInventorySummary] = useState({
    outOfStock: 0,
    lowStock: 0,
    normalStock: 0,
    total: 0,
    alerts: [],
  });
  const [copilotQuestion, setCopilotQuestion] = useState("");

  const newCopilotSessionId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  };

  const copilotSessionId = useMemo(() => newCopilotSessionId(), [selectedId]);

  const fetchFeedback = async () => {
    try {
      const response = await getAdminFeedback();
      const list = response?.data?.items || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching support feedback:", error);
      alert("Không thể tải danh sách hỗ trợ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  useEffect(() => {
    const fetchInventorySummary = async () => {
      setInventoryLoading(true);
      try {
        const response = await getProducts({ page: 1, limit: 200 });
        const productItems = response?.data?.items || [];
        const summary = productItems.reduce(
          (acc, item) => {
            const stockNumber = Number(item?.stock);
            const safeStock = Number.isFinite(stockNumber) ? Math.max(0, Math.floor(stockNumber)) : 0;
            const status = getStockStatus(safeStock);
            acc.total += 1;
            if (status === "out") {
              acc.outOfStock += 1;
              acc.alerts.push({ title: item?.title || "Sản phẩm chưa đặt tên", stock: safeStock, status });
            } else if (status === "low") {
              acc.lowStock += 1;
              acc.alerts.push({ title: item?.title || "Sản phẩm chưa đặt tên", stock: safeStock, status });
            } else {
              acc.normalStock += 1;
            }
            return acc;
          },
          { outOfStock: 0, lowStock: 0, normalStock: 0, total: 0, alerts: [] }
        );

        setInventorySummary({
          ...summary,
          alerts: summary.alerts.sort((a, b) => a.stock - b.stock).slice(0, 4),
        });
      } catch (error) {
        console.error("Error loading inventory summary:", error);
        setInventorySummary({
          outOfStock: 0,
          lowStock: 0,
          normalStock: 0,
          total: 0,
          alerts: [],
        });
      } finally {
        setInventoryLoading(false);
      }
    };

    fetchInventorySummary();
  }, []);

  const handoffItems = useMemo(
    () =>
      items
        .filter((item) => item.channel === "assistant_handoff")
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
    [items]
  );

  useEffect(() => {
    if (!handoffItems.length) {
      setSelectedId("");
      return;
    }
    if (!selectedId || !handoffItems.some((item) => String(item._id) === String(selectedId))) {
      setSelectedId(String(handoffItems[0]._id));
    }
  }, [handoffItems, selectedId]);

  const selectedConversation = handoffItems.find(
    (item) => String(item._id) === String(selectedId)
  );

  const selectedConversationText = useMemo(() => {
    if (!selectedConversation) return "";
    const messageParts = (selectedConversation.messages || [])
      .slice(-10)
      .map((msg) => `${msg.sender}: ${msg.content}`)
      .join("\n");
    return `${selectedConversation.message || ""}\n${messageParts}`.trim();
  }, [selectedConversation]);

  const supportTags = useMemo(
    () => detectSupportTags(selectedConversationText),
    [selectedConversationText]
  );

  const escalationSuggestion = useMemo(
    () =>
      buildEscalationSuggestion({
        text: selectedConversationText,
        status: selectedConversation?.status || "open",
        tags: supportTags,
      }),
    [selectedConversation?.status, selectedConversationText, supportTags]
  );

  const quickReplySuggestions = useMemo(
    () => buildQuickReplySuggestions({ text: selectedConversationText, tags: supportTags }),
    [selectedConversationText, supportTags]
  );

  const fetchCopilot = useCallback(
    async (messageText) => {
      if (!selectedConversation) {
        setCopilotSections(createDefaultSections());
        setCopilotError("");
        setAppliedCategory("");
        setEscalationFlag(false);
        return;
      }
      const msg = String(messageText || "").trim() || DEFAULT_ADMIN_COPILOT_MESSAGE;
      setCopilotLoading(true);
      setCopilotError("");
      try {
        const response = await sendAssistantChat(msg, {
          supportConversationId: String(selectedConversation._id || ""),
          supportMode: "admin_copilot",
          supportStatus: selectedConversation.status || "open",
          adminCopilot: buildAdminCopilotContextPayload({
            conversationText: selectedConversationText || selectedConversation.message || "",
            ticketId: String(selectedConversation._id || ""),
            copilotSessionId,
            conversationStatus: selectedConversation.status || "open",
            supportTags,
            escalationTitle: escalationSuggestion.title,
            escalationLevel: escalationSuggestion.level,
            inventorySummary,
          }),
        });
        setCopilotSections(parseAdminCopilotSections(response?.mainAnswer || response?.message || ""));
      } catch (error) {
        console.error("Error loading admin copilot suggestion:", error);
        setCopilotError("Trợ lý hỗ trợ tạm thời chưa phản hồi. Bạn vẫn có thể dùng các gợi ý nhanh bên dưới.");
        setCopilotSections(createDefaultSections());
      } finally {
        setCopilotLoading(false);
      }
    },
    [
      copilotSessionId,
      escalationSuggestion.level,
      escalationSuggestion.title,
      inventorySummary,
      selectedConversation,
      selectedConversationText,
      supportTags,
    ]
  );

  useEffect(() => {
    fetchCopilot(DEFAULT_ADMIN_COPILOT_MESSAGE);
  }, [fetchCopilot]);

  useEffect(() => {
    setCopilotQuestion("");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedConversation) {
      setAppliedCategory("");
      setEscalationFlag(false);
      return;
    }
    setAppliedCategory((prev) => prev || supportTags[0] || "");
    setEscalationFlag(false);
  }, [selectedConversation, supportTags]);

  const waitingCount = useMemo(
    () => handoffItems.filter((item) => item.handoffState === "waiting_human").length,
    [handoffItems]
  );

  const updateConversationLocal = (feedbackId, updater) => {
    setItems((prev) =>
      prev.map((item) => {
        if (String(item._id) !== String(feedbackId)) return item;
        return typeof updater === "function" ? updater(item) : updater;
      })
    );
  };

  const handleChangeStatus = async (feedbackId, nextStatus) => {
    setUpdatingId(feedbackId);
    try {
      const response = await updateAdminFeedbackStatus(feedbackId, { status: nextStatus });
      const updated = response?.data?.item;
      updateConversationLocal(feedbackId, updated || ((item) => ({ ...item, status: nextStatus })));
    } catch (error) {
      console.error("Error updating support status:", error);
      alert("Cập nhật trạng thái thất bại.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReply = async () => {
    if (!selectedConversation) return;
    const draft = String(replyText || "").trim();
    if (!draft) return;

    setUpdatingId(selectedConversation._id);
    try {
      const response = await postAdminSupportConversationMessage(selectedConversation._id, {
        message: draft,
      });
      const updated = response?.data?.conversation || response?.data?.item;
      updateConversationLocal(selectedConversation._id, updated || selectedConversation);
      setReplyText("");
    } catch (error) {
      console.error("Error replying support ticket:", error);
      alert("Gửi phản hồi thất bại.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p>Đang tải trung tâm hỗ trợ...</p>;
  }

  return (
    <div className="admin-support-container">
      <header className="admin-support-header">
        <div className="admin-support-header__title">
          <h1>Trung tâm hỗ trợ</h1>
          <p>Vận hành hội thoại được chuyển từ Trợ lý Bookie sang nhân viên hỗ trợ.</p>
        </div>
        <div className="admin-support-stats">
          <span>{handoffItems.length} hội thoại</span>
          <span>{waitingCount} đang chờ</span>
        </div>
      </header>

      {!handoffItems.length ? (
        <div className="admin-support-empty">
          <p className="admin-support-empty__title">Chưa có hội thoại cần nhân viên hỗ trợ</p>
          <p className="admin-support-empty__desc">
            Khi người dùng yêu cầu liên hệ nhân viên, cuộc hội thoại sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="admin-support-inbox">
          <aside className="admin-support-list">
            <div className="admin-support-list__head">Hộp thư hỗ trợ</div>
            <div className="admin-support-list__scroll">
              {handoffItems.map((item) => {
                const latest = Array.isArray(item.messages) && item.messages.length
                  ? item.messages[item.messages.length - 1]
                  : null;
                const isActive = String(item._id) === String(selectedId);
                return (
                  <button
                    key={item._id}
                    type="button"
                    className={`admin-support-list-item${isActive ? " is-active" : ""}`}
                    onClick={() => setSelectedId(String(item._id))}
                  >
                    <div className="admin-support-list-item__top">
                      <strong>{item.userEmail || item.userId || "Người dùng"}</strong>
                      <span className={`support-state support-state--${item.handoffState || "waiting_human"}`}>
                        {prettyState(item.handoffState)}
                      </span>
                    </div>
                    <p className="admin-support-list-item__preview">
                      {latest?.content || item.message || "Không có nội dung"}
                    </p>
                    <div className="admin-support-list-item__meta">
                      <span>{new Date(item.updatedAt || item.createdAt).toLocaleString("vi-VN")}</span>
                      {item.handoffState === "waiting_human" ? (
                        <span className="pending-dot" aria-label="Cần phản hồi" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="admin-support-detail">
            {!selectedConversation ? (
              <div className="admin-support-empty admin-support-empty--inline">
                <p className="admin-support-empty__title">Chọn một hội thoại để bắt đầu hỗ trợ</p>
              </div>
            ) : (
              <>
                <header className="admin-support-detail__head">
                  <div>
                    <h2>{selectedConversation.userEmail || selectedConversation.userId}</h2>
                    <p>Phiếu hỗ trợ: {selectedConversation._id}</p>
                  </div>
                  <div className="admin-support-detail__actions">
                    <span
                      className={`support-state support-state--${selectedConversation.handoffState || "waiting_human"}`}
                    >
                      {prettyState(selectedConversation.handoffState)}
                    </span>
                    <select
                      value={selectedConversation.status}
                      disabled={updatingId === selectedConversation._id}
                      onChange={(e) => handleChangeStatus(selectedConversation._id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status] || status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="quick-action quick-action--process"
                      disabled={updatingId === selectedConversation._id}
                      onClick={() => handleChangeStatus(selectedConversation._id, "in_progress")}
                    >
                      Đang xử lý
                    </button>
                    <button
                      type="button"
                      className="quick-action quick-action--close"
                      disabled={updatingId === selectedConversation._id}
                      onClick={() => handleChangeStatus(selectedConversation._id, "closed")}
                    >
                      Đóng hội thoại
                    </button>
                  </div>
                </header>

                <div className="admin-support-messages">
                  <div className="support-stream-note" role="note">
                    Luồng chat này gồm tin nhắn khách hàng, nhân viên hỗ trợ và hệ thống/trợ lý để tham chiếu vận hành.
                  </div>
                  {(selectedConversation.messages || []).map((msg, idx) => (
                    <div key={`${selectedConversation._id}-msg-${idx}`} className={`support-msg support-msg--${msg.sender}`}>
                      <div className="support-msg__label-wrap">
                        <span className={ROLE_META[msg.sender]?.className || ROLE_META.system.className}>
                          {ROLE_META[msg.sender]?.icon || ROLE_META.system.icon}
                          {ROLE_META[msg.sender]?.label || ROLE_META.system.label}
                        </span>
                      </div>
                      <div className="support-msg__bubble">{msg.content}</div>
                      <time className="support-msg__time">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString("vi-VN") : ""}
                      </time>
                    </div>
                  ))}
                </div>

                <div className="admin-support-composer">
                  <label htmlFor="admin-reply">Phản hồi người dùng</label>
                  <div className="admin-support-composer__hints">
                    <span>
                      Phân loại: <strong>{appliedCategory || "Chưa áp dụng"}</strong>
                    </span>
                    <span className={escalationFlag ? "hint-escalate is-active" : "hint-escalate"}>
                      {escalationFlag ? "Đã đánh dấu cần escalate" : "Chưa đánh dấu escalate"}
                    </span>
                  </div>
                  <textarea
                    id="admin-reply"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung phản hồi..."
                  />
                  <div className="admin-support-composer__footer">
                    <button
                      type="button"
                      className="reply-btn"
                      disabled={updatingId === selectedConversation._id}
                      onClick={handleReply}
                    >
                      Trả lời
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="admin-support-copilot">
            <div className="admin-support-copilot__head">
              <h3>
                <FaRobot aria-hidden />
                Trợ lý hỗ trợ nội bộ
              </h3>
              <p>Gợi ý nhanh cho nhân viên dựa trên hội thoại hiện tại và dữ liệu hệ thống.</p>
            </div>

            <div className="admin-support-copilot__prompt">
              <input
                type="text"
                className="admin-support-copilot__prompt-input"
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                placeholder="Câu hỏi bổ sung cho copilot (tuỳ chọn)"
                aria-label="Câu hỏi bổ sung cho copilot"
              />
              <button
                type="button"
                className="admin-support-copilot__prompt-send"
                disabled={copilotLoading}
                onClick={() => fetchCopilot(copilotQuestion)}
              >
                Hỏi copilot
              </button>
            </div>

            <div className="admin-support-copilot__scroll">
              <section className="admin-support-copilot__panel">
                <h4>
                  <FaReply aria-hidden />
                  Gợi ý trả lời nhanh
                </h4>
                <div className="admin-support-copilot__chips">
                  {quickReplySuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="copilot-chip"
                      onClick={() => setReplyText(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-support-copilot__panel">
                <h4>
                  <FaTags aria-hidden />
                  Đề xuất phân loại
                </h4>
                <div className="admin-support-copilot__tags admin-support-copilot__tags--actionable">
                  {supportTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`copilot-tag-btn${appliedCategory === tag ? " is-active" : ""}`}
                      onClick={() => setAppliedCategory(tag)}
                    >
                      <span className="copilot-tag">{tag}</span>
                      <span className="copilot-tag-btn__meta">Áp dụng</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className={`admin-support-copilot__panel escalation escalation--${escalationSuggestion.level}`}>
                <h4>
                  <FaExclamationTriangle aria-hidden />
                  Đề xuất escalate
                </h4>
                <p className="escalation__title">{escalationSuggestion.title}</p>
                <p className="escalation__detail">{escalationSuggestion.detail}</p>
                <button
                  type="button"
                  className={`escalation-action${escalationFlag ? " is-active" : ""}`}
                  onClick={() => setEscalationFlag((v) => !v)}
                >
                  {escalationFlag ? "Bỏ đánh dấu escalate" : "Đánh dấu cần escalate"}
                </button>
              </section>

              <section className="admin-support-copilot__panel">
                <h4>
                  <FaBoxes aria-hidden />
                  Cảnh báo tồn kho
                </h4>
                {inventoryLoading ? (
                  <p className="admin-support-copilot__muted">Đang tải dữ liệu tồn kho...</p>
                ) : (
                  <>
                    <div className="stock-summary">
                      <div className="stock-summary__item stock-summary__item--out">
                        <span>Hết hàng</span>
                        <strong>{inventorySummary.outOfStock}</strong>
                      </div>
                      <div className="stock-summary__item stock-summary__item--low">
                        <span>Sắp hết</span>
                        <strong>{inventorySummary.lowStock}</strong>
                      </div>
                      <div className="stock-summary__item">
                        <span>Bình thường</span>
                        <strong>{inventorySummary.normalStock}</strong>
                      </div>
                    </div>
                    {inventorySummary.alerts.length ? (
                      <ul className="stock-alert-list">
                        {inventorySummary.alerts.map((item) => (
                          <li key={`${item.title}-${item.stock}`}>
                            <span>{item.title}</span>
                            <strong className={item.status === "out" ? "is-out" : "is-low"}>
                              {item.status === "out" ? "Hết hàng" : `Còn ${item.stock}`}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="admin-support-copilot__muted">
                        Không có cảnh báo tồn kho trong thời điểm hiện tại.
                      </p>
                    )}
                  </>
                )}
              </section>

              <section className="admin-support-copilot__panel">
                <h4>
                  <FaRobot aria-hidden />
                  Kết quả copilot
                </h4>
                {copilotLoading ? (
                  <p className="admin-support-copilot__muted">Trợ lý đang phân tích hội thoại...</p>
                ) : copilotError ? (
                  <p className="admin-support-copilot__muted">{copilotError}</p>
                ) : (
                  <div className="copilot-sections">
                    {Object.entries(copilotSections).map(([title, content]) => (
                      <article key={title} className="copilot-section">
                        <h5>{title}</h5>
                        <p>{content}</p>
                        {title === "Câu trả lời gợi ý" ? (
                          <button
                            type="button"
                            className="copilot-inline-action"
                            onClick={() => setReplyText(content.replace(/^-+\s*/g, "").trim())}
                          >
                            Chèn vào khung trả lời
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminSupport;
