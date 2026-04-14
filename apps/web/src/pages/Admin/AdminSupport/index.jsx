import { useEffect, useMemo, useState } from "react";
import { getAdminFeedback, updateAdminFeedbackStatus } from "../../../api/supportApi";
import "./AdminSupport.css";

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

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

  const fetchFeedback = async () => {
    try {
      const response = await getAdminFeedback();
      const list = response?.data?.items || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching support feedback:", error);
      alert("Khong the tai danh sach feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
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
      alert("Cap nhat trang thai that bai.");
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
      const nextStatus = selectedConversation.status === "open" ? "in_progress" : selectedConversation.status;
      const response = await updateAdminFeedbackStatus(selectedConversation._id, {
        status: nextStatus,
        message: draft,
      });
      const updated = response?.data?.item;
      updateConversationLocal(selectedConversation._id, updated || selectedConversation);
      setReplyText("");
    } catch (error) {
      console.error("Error replying support ticket:", error);
      alert("Gui phan hoi that bai.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p>Dang tai danh sach ho tro...</p>;
  }

  return (
    <div className="admin-support-container">
      <header className="admin-support-header">
        <div>
          <h1>Support Inbox</h1>
          <p>Quan ly hoi thoai da duoc chuyen tu Tro ly Bookie sang nhan vien.</p>
        </div>
        <div className="admin-support-stats">
          <span>{handoffItems.length} hoi thoai</span>
        </div>
      </header>

      {!handoffItems.length ? (
        <div className="admin-support-empty">
          <p className="admin-support-empty__title">Chua co hoi thoai can nhan vien</p>
          <p className="admin-support-empty__desc">
            Khi nguoi dung yeu cau lien he nhan vien, hoi thoai se xuat hien tai day.
          </p>
        </div>
      ) : (
        <div className="admin-support-inbox">
          <aside className="admin-support-list">
            <div className="admin-support-list__head">Danh sach hoi thoai</div>
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
                    <strong>{item.userEmail || item.userId || "Nguoi dung"}</strong>
                    <span className={`support-state support-state--${item.handoffState || "waiting_human"}`}>
                      {prettyState(item.handoffState)}
                    </span>
                  </div>
                  <p className="admin-support-list-item__preview">
                    {latest?.content || item.message || "Khong co noi dung"}
                  </p>
                  <div className="admin-support-list-item__meta">
                    <span>{new Date(item.updatedAt || item.createdAt).toLocaleString("vi-VN")}</span>
                    {item.handoffState === "waiting_human" ? (
                      <span className="pending-dot" aria-label="Can phan hoi" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </aside>

          <section className="admin-support-detail">
            {!selectedConversation ? (
              <div className="admin-support-empty admin-support-empty--inline">
                <p className="admin-support-empty__title">Chon mot hoi thoai de bat dau ho tro</p>
              </div>
            ) : (
              <>
                <header className="admin-support-detail__head">
                  <div>
                    <h2>{selectedConversation.userEmail || selectedConversation.userId}</h2>
                    <p>Ticket: {selectedConversation._id}</p>
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
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="quick-action quick-action--process"
                      disabled={updatingId === selectedConversation._id}
                      onClick={() => handleChangeStatus(selectedConversation._id, "in_progress")}
                    >
                      Dang xu ly
                    </button>
                    <button
                      type="button"
                      className="quick-action quick-action--close"
                      disabled={updatingId === selectedConversation._id}
                      onClick={() => handleChangeStatus(selectedConversation._id, "closed")}
                    >
                      Dong hoi thoai
                    </button>
                  </div>
                </header>

                <div className="admin-support-messages">
                  {(selectedConversation.messages || []).map((msg, idx) => (
                    <div key={`${selectedConversation._id}-msg-${idx}`} className={`support-msg support-msg--${msg.sender}`}>
                      <div className="support-msg__label">
                        {msg.sender === "admin"
                          ? "Nhan vien ho tro"
                          : msg.sender === "system"
                            ? "He thong / Tro ly"
                            : "Nguoi dung"}
                      </div>
                      <div className="support-msg__bubble">{msg.content}</div>
                      <time className="support-msg__time">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString("vi-VN") : ""}
                      </time>
                    </div>
                  ))}
                </div>

                <div className="admin-support-composer">
                  <label htmlFor="admin-reply">Tra loi nguoi dung</label>
                  <textarea
                    id="admin-reply"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhap noi dung phan hoi..."
                  />
                  <div className="admin-support-composer__footer">
                    <button
                      type="button"
                      className="reply-btn"
                      disabled={updatingId === selectedConversation._id}
                      onClick={handleReply}
                    >
                      Tra loi
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminSupport;
