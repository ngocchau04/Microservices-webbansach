import { useCallback, useEffect, useRef, useState } from "react";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import {
  fetchAssistantSuggestions,
  sendAssistantChat,
  sendAssistantImageChat,
} from "../../services/assistantApi";
import ReactMarkdown from "react-markdown";
import { getMySupportConversations, postMySupportConversationMessage } from "../../api/supportApi";
import { useUser } from "../../context/UserContext";
import ChatProductCard from "./ChatProductCard";
import "./Chat.css";

const SESSION_KEY = "bookieAssistantCtx";
const SUPPORT_STATE_KEY = "bookieAssistantSupport";
const CLIENT_SESSION_KEY = "bookieAssistantClientSessionId";

function loadSessionContext() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessionContext(hints) {
  if (!hints || typeof hints !== "object") {
    return;
  }
  const next = {
    lastProductId: hints.focusProductId || hints.lastProductId || "",
    focusAuthorKey: hints.focusAuthorKey || "",
    focusCategoryKey: hints.focusCategoryKey || "",
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

function loadSupportState() {
  try {
    const raw = sessionStorage.getItem(SUPPORT_STATE_KEY);
    if (!raw) {
      return { mode: "bot_only", conversationId: "", state: "bot_only" };
    }
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode || "bot_only",
      conversationId: parsed.conversationId || "",
      state: parsed.state || "bot_only",
    };
  } catch {
    return { mode: "bot_only", conversationId: "", state: "bot_only" };
  }
}

function saveSupportState(next) {
  const value = {
    mode: next?.mode || "bot_only",
    conversationId: next?.conversationId || "",
    state: next?.state || "bot_only",
  };
  sessionStorage.setItem(SUPPORT_STATE_KEY, JSON.stringify(value));
}

function getClientSessionId() {
  const existing = sessionStorage.getItem(CLIENT_SESSION_KEY);
  if (existing) {
    return existing;
  }
  const generated = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(CLIENT_SESSION_KEY, generated);
  return generated;
}

function getCurrentProductIdFromPath() {
  const path = window.location.pathname || "";
  const match = path.match(/^\/book\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

function Chat() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [supportState, setSupportState] = useState(loadSupportState);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  
  // Dragging State
  // Dragging State
  const [pos, setPos] = useState({ x: 0, y: 0 }); 
  const [isDragging, setIsDragging] = useState(false);
  
  const bubbleRef = useRef(null);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const supportSeenRef = useRef(new Set());

  const scrollToBottom = () => {
    const el = bodyRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  const loadSuggestions = useCallback(async () => {
    try {
      const data = await fetchAssistantSuggestions();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadSuggestions();
    }
  }, [open, loadSuggestions]);

  const onDragStart = (e) => {
    // We don't call preventDefault() here to allow clicks to bubble, 
    // but we use totalMove to distinguish.
    e.stopPropagation();
    
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = pos.x;
    const initialY = pos.y;
    
    let currentX = initialX;
    let currentY = initialY;
    let totalMove = 0;

    const onMouseMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      totalMove += Math.abs(dx) + Math.abs(dy);
      
      currentX = initialX + dx;
      currentY = initialY + dy;

      bubble.style.setProperty("transform", `translate3d(${currentX}px, ${currentY}px, 0)`, "important");
      bubble.style.setProperty("transition", "none", "important");
      bubble.classList.add("dragging");
      
      const panel = panelRef.current;
      if (panel) {
        panel.style.setProperty("transform", `translate3d(${currentX}px, ${currentY}px, 0)`, "important");
        panel.style.setProperty("transition", "none", "important");
        panel.classList.add("dragging");
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      
      bubble.classList.remove("dragging");
      bubble.style.removeProperty("transition");
      const panel = panelRef.current;
      if (panel) {
        panel.classList.remove("dragging");
        panel.style.removeProperty("transition");
      }

      if (totalMove < 8) {
        setOpen((v) => !v);
      } else {
        setPos({ x: currentX, y: currentY });
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, open]);

  const appendMessage = useCallback((role, payload) => {
    setMessages((prev) => [...prev, { role, ...payload }]);
  }, []);

  const appendSupportMessages = useCallback(
    (conversation) => {
      if (!conversation || !Array.isArray(conversation.messages)) {
        return;
      }
      const conversationId = conversation._id || conversation.id;
      conversation.messages.forEach((msg) => {
        if (!msg || msg.sender === "user") {
          return;
        }
        const key = `${conversationId}:${msg.sender}:${msg.createdAt}:${msg.content}`;
        if (supportSeenRef.current.has(key)) {
          return;
        }
        supportSeenRef.current.add(key);
        appendMessage("support", {
          text: msg.content,
          supportSender: msg.sender,
          createdAt: msg.createdAt,
        });
      });
    },
    [appendMessage]
  );

  const syncSupportConversation = useCallback(async () => {
    if (!user?._id || !supportState.conversationId) {
      return;
    }
    try {
      const response = await getMySupportConversations();
      const items = response?.data?.items || [];
      const found = items.find((item) => String(item._id) === String(supportState.conversationId));
      if (!found) {
        return;
      }
      appendSupportMessages(found);
      const next = {
        mode: "human",
        conversationId: found._id,
        state: found.handoffState || "waiting_human",
      };
      setSupportState(next);
      saveSupportState(next);
    } catch {
      // silent polling fail
    }
  }, [appendSupportMessages, supportState.conversationId, user?._id]);

  const sendWithText = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }
    appendMessage("user", { text: trimmed, createdAt: new Date().toISOString() });
    setInput("");
    setLoading(true);

    try {
      if (
        supportState.mode === "human" &&
        supportState.conversationId &&
        (supportState.state === "waiting_human" || supportState.state === "human_active")
      ) {
        if (!user?._id) {
          appendMessage("support", {
            text: "Bạn cần đăng nhập để tiếp tục trao đổi với nhân viên hỗ trợ.",
            supportSender: "system",
          });
          return;
        }
        await postMySupportConversationMessage(supportState.conversationId, {
          message: trimmed,
        });
        appendMessage("support", {
          text: "Đã gửi tới nhân viên hỗ trợ. Mình sẽ cập nhật khi có phản hồi.",
          supportSender: "system",
        });
        await syncSupportConversation();
        return;
      }

      const ctx = loadSessionContext();
      const recentMessages = messages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text || m.mainAnswer || "",
        createdAt: m.createdAt || new Date().toISOString(),
      }));

      const data = await sendAssistantChat(trimmed, {
        lastProductId: ctx.lastProductId || undefined,
        currentProductId: getCurrentProductIdFromPath() || undefined,
        focusAuthorKey: ctx.focusAuthorKey || undefined,
        focusCategoryKey: ctx.focusCategoryKey || undefined,
        userId: user?._id || "",
        userEmail: user?.email || "",
        sessionId: getClientSessionId(),
        recentMessages,
      }, {
        currentProductId: getCurrentProductIdFromPath() || undefined,
      });

      saveSessionContext(data.sessionHints || {});
      if (data.handoff?.mode === "human") {
        const next = {
          mode: "human",
          conversationId: data.handoff.conversationId || data.sessionHints?.supportConversationId || "",
          state: data.handoff.state || data.sessionHints?.supportState || "waiting_human",
        };
        setSupportState(next);
        saveSupportState(next);
      }

      appendMessage("assistant", {
        text: data.message || "",
        mainAnswer: data.mainAnswer,
        whyExplanation: data.whyExplanation,
        sources: data.sources || [],
        recommendations: data.recommendations || [],
        followUpChips: data.followUpChips || [],
        graphReasoningInfo: data.graphReasoningInfo || null,
        handoff: data.handoff || null,
        fallback: data.fallback,
        createdAt: new Date().toISOString(),
      });
    } catch {
      appendMessage("assistant", {
        text: "Không thể kết nối trợ lý. Vui lòng thử lại sau hoặc kiểm tra API gateway.",
        fallback: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    await sendWithText(input);
  };

  const handleImageSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      setSelectedImagePreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      appendMessage("assistant", { text: "Vui long chon file anh (jpg/png/webp)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      appendMessage("assistant", { text: "Anh vuot qua 5MB. Vui long chon anh nho hon." });
      return;
    }
    setSelectedImage(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  };

  const handleSendImage = async () => {
    if (!selectedImage || loading) {
      return;
    }
    appendMessage("user", {
      text: input?.trim() || "Tim sach giong anh nay",
      createdAt: new Date().toISOString(),
    });
    setLoading(true);
    try {
      const data = await sendAssistantImageChat({
        message: input?.trim() || "Tim sach giong anh nay",
        imageFile: selectedImage,
        currentProductId: getCurrentProductIdFromPath() || undefined,
      });
      appendMessage("assistant", {
        text: data.message || "",
        mainAnswer: data.mainAnswer,
        recommendations: data.recommendations || [],
        followUpChips: data.followUpChips || [],
        graphReasoningInfo: data.graphReasoningInfo || null,
        fallback: data.fallback,
        createdAt: new Date().toISOString(),
      });
      setInput("");
      setSelectedImage(null);
      setSelectedImagePreview("");
    } catch {
      appendMessage("assistant", {
        text: "Tinh nang tim sach bang anh chua san sang. Ban co the nhap ten sach hoac chu de.",
        fallback: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || supportState.mode !== "human" || !supportState.conversationId || !user?._id) {
      return undefined;
    }
    syncSupportConversation();
    const timer = setInterval(syncSupportConversation, 7000);
    return () => clearInterval(timer);
  }, [open, supportState.mode, supportState.conversationId, syncSupportConversation, user?._id]);

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          className={`chat-panel ${isDragging ? "dragging" : ""}`}
          role="dialog"
          aria-label="Trợ lý Bookie"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          }}
        >
          <div className="chat-panel-header" onMouseDown={onDragStart} style={{ cursor: "move" }}>
            <div className="chat-panel-title-block">
              <span className="chat-panel-title">Trợ lý Bookie</span>
              <span className="chat-panel-sub">Hỗ trợ mua sắm &amp; Tư vấn trực tuyến</span>
            </div>
            <button
              type="button"
              className="chat-panel-close"
              onClick={() => setOpen(false)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ×
            </button>
          </div>
          {supportState.mode === "human" ? (
            <div className="chat-support-banner" role="status" aria-live="polite">
              <span className="chat-support-banner__dot" />
              {supportState.state === "human_active"
                ? "Nhân viên hỗ trợ đang tham gia cuộc trò chuyện."
                : "Đang chờ nhân viên hỗ trợ phản hồi."}
            </div>
          ) : null}
          <div className="chat-panel-body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p className="chat-welcome-lead">Chào mừng bạn đến với Bookie! Mình có thể giúp gì cho bạn hôm nay?</p>
                <ul className="chat-welcome-list">
                  <li>Tìm kiếm những đầu sách phù hợp nhất với sở thích</li>
                  <li>Gợi ý sách cùng thể loại hoặc cùng tác giả yêu thích</li>
                  <li>Giải đáp nhanh các chính sách mua hàng và ưu đãi</li>
                </ul>
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={`msg-${idx}`} className={`chat-msg chat-msg-${m.role}`}>
                {m.role === "user" ? (
                  <div className="chat-msg-text chat-msg-text-user">{m.text}</div>
                ) : (
                  <div className="chat-msg-assistant-wrap">
                    {m.role === "support" ? (
                      <div className="chat-msg-support-label">
                        {m.supportSender === "admin" ? "Nhân viên hỗ trợ" : "Hệ thống hỗ trợ"}
                      </div>
                    ) : null}
                    <div
                      className={`chat-msg-text chat-msg-text-assistant${
                        m.role === "support" ? " chat-msg-text-support" : ""
                      }`}
                    >
                      {m.mainAnswer ? (
                        <>
                          <div className="chat-main-answer markdown-body">
                            <ReactMarkdown>{m.mainAnswer}</ReactMarkdown>
                          </div>
                          {m.graphReasoningInfo?.policyBadge ? (
                            <div className="chat-graph-badges" aria-label="Luồng đồ thị">
                              <span className="chat-graph-badge chat-graph-badge--policy">
                                Liên kết chính sách
                              </span>
                            </div>
                          ) : null}
                          {Array.isArray(m.graphReasoningInfo?.pathsUsed) &&
                          m.graphReasoningInfo.pathsUsed.length > 0 &&
                          !m.graphReasoningInfo?.policyBadge ? (
                            <div className="chat-graph-badges" aria-label="Đường đi đồ thị">
                              {m.graphReasoningInfo.expandedBy === "same_author" ? (
                                <span className="chat-graph-badge">Cùng tác giả</span>
                              ) : null}
                              {m.graphReasoningInfo.expandedBy === "same_category" ? (
                                <span className="chat-graph-badge">Cùng thể loại</span>
                              ) : null}
                              {m.graphReasoningInfo.expandedBy === "related_next" ? (
                                <span className="chat-graph-badge">Gợi ý tiếp theo</span>
                              ) : null}
                              {m.graphReasoningInfo.expandedBy === "search_hybrid" ? (
                                <span className="chat-graph-badge">Retrieval + đồ thị</span>
                              ) : null}
                              {m.graphReasoningInfo.pathsUsed?.some(
                                (s) => s.op === "filter_cheaper_in_category"
                              ) ? (
                                <span className="chat-graph-badge">Giá mềm hơn</span>
                              ) : null}
                            </div>
                          ) : null}
                          {m.handoff?.mode === "human" ? (
                            <div className="chat-handoff-pill">Đã chuyển cuộc trò chuyện cho nhân viên hỗ trợ</div>
                          ) : null}
                        </>
                      ) : (
                        <div className="chat-main-answer markdown-body">
                          <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {m.role !== "support" && Array.isArray(m.recommendations) && m.recommendations.length > 0 && (
                      <div className="chat-rec-cards">
                        {m.recommendations.slice(0, 4).map((item, i) => (
                          <ChatProductCard key={`${item.productId || i}-${i}`} item={item} />
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && m.sources?.length > 0 && (
                      <div className="chat-sources">
                        <span className="chat-sources-label">Nguồn</span>
                        <div className="chat-source-badges">
                          {m.sources.slice(0, 5).map((s, si) => (
                            <span key={`${s.id}-${si}`} className="chat-source-badge" title={s.excerpt}>
                              {s.label || s.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.role === "assistant" &&
                      Array.isArray(m.followUpChips) &&
                      m.followUpChips.length > 0 && (
                        <div className="chat-follow-chips">
                          {m.followUpChips.map((c) => (
                            <button
                              key={c.id || c.label}
                              type="button"
                              className="chat-follow-chip"
                              onClick={() => sendWithText(c.label)}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-msg chat-msg-assistant">
                <div className="chat-typing" aria-busy="true">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-text">Đang trả lời…</span>
                </div>
              </div>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="chat-suggestions">
              {suggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => sendWithText(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="chat-panel-input-row">
            <input
              type="text"
              className="chat-panel-input"
              placeholder={
                supportState.mode === "human"
                  ? "Nhập tin nhắn để gửi nhân viên hỗ trợ…"
                  : "Hỏi về sách, tác giả, giao hàng…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <button type="button" className="chat-panel-send" onClick={handleSend} disabled={loading}>
              Gửi
            </button>
            <label className="chat-panel-send" style={{ cursor: "pointer" }}>
              Ảnh
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageSelected}
                style={{ display: "none" }}
              />
            </label>
            <button
              type="button"
              className="chat-panel-send"
              onClick={handleSendImage}
              disabled={loading || !selectedImage}
            >
              Gửi ảnh
            </button>
          </div>
          {selectedImagePreview ? (
            <div style={{ padding: "8px 12px" }}>
              <img
                src={selectedImagePreview}
                alt="preview"
                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }}
              />
            </div>
          ) : null}
        </div>
      )}
      <div
        ref={bubbleRef}
        className={`chat-bubble ${isDragging && !open ? "dragging" : ""}`}
        onMouseDown={onDragStart}
        role="button"
        tabIndex={0}
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <IoChatbubbleEllipsesOutline className="chat-icon" />
      </div>
    </>
  );
}

export default Chat;
